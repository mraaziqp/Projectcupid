/**
 * Every Project Cupid API route, in one place. Vercel runs it as a single
 * function (api/index.ts) and the local dev server mounts the same router.
 *
 * One function rather than one per file: the Hobby plan stops at 12 and the
 * project was already there, and per-file functions importing ../src without
 * extensions crashed under ESM (FUNCTION_INVOCATION_FAILED in production).
 */
import { Readable } from "node:stream";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./firebaseAdmin.js";
import { APP_VERSION, env } from "./config.js";
import { bearer, header, HttpError, jsonBody, onlyKeys, queryParam, sendJson, text, type ApiRequest, type ApiResponse } from "./http.js";
import { requireAdmin, requireKey, requireMember, sideOf, type Member } from "./authz.js";
import { secretEquals } from "./crypto.js";
import { linkSaveState, saveStateToken, signInWithSaveState, syncSaveStateProfile, unlinkSaveState } from "./identity.js";
import * as ss from "./savestate.js";
import { notifyPartner, NOTIFY_KINDS, type NotifyKind } from "./notify.js";
import { draftLetter } from "./ai.js";
import { AdminUnavailableError } from "./firebaseAdmin.js";
import {
  addMedia, createMemory, deleteMemory, disconnectSource, importRecords, mediaFor,
  previewInternal, previewSaveState, previewWedding, reconnectSource, sourcesStatus,
} from "./memories.js";
import { decideProposal, executeTool, JARVIS_TOOLS } from "./jarvisTools.js";
import { acceptBridgeEntry } from "./bridge.js";
import { runDiagnostics } from "./diagnostics.js";
import { audit, carryOver, fixRoles } from "./migration.js";
import { cronSync, logEvent, shareMemoryKnowledge } from "./ecosystem.js";
import type { MemorySource } from "../../src/lib/memoryGarden/model.js";

type Ctx = { req: ApiRequest; res: ApiResponse; body: () => Promise<Record<string, any>> };
type Handler = (c: Ctx) => Promise<unknown>;
const routes = new Map<string, Handler>();
const on = (method: "GET" | "POST", path: string, h: Handler) => routes.set(`${method} ${path}`, h);

// ── Rate limiting for sign-in (SaveState sees every Cupid sign-in as Vercel's IP) ──
async function loginLimit(req: ApiRequest, failed: boolean | null) {
  const ip = (header(req, "x-forwarded-for").split(",")[0] || header(req, "x-real-ip") || "local").trim().slice(0, 64);
  const ref = adminDb().collection("rate_limits").doc(`login_${ip.replace(/[^A-Za-z0-9:.]/g, "_")}`);
  const snap = await ref.get();
  const windowStart = Number(snap.get("windowStart") ?? 0);
  const fresh = Date.now() - windowStart > 15 * 60_000;
  const failures = fresh ? 0 : Number(snap.get("failures") ?? 0);
  if (failed === null) {
    if (failures >= 8) throw new HttpError(429, "Too many sign-in attempts. Wait 15 minutes and try again.", "rate_limited");
    return;
  }
  if (failed) await ref.set({ windowStart: fresh ? Date.now() : windowStart, failures: failures + 1, expiresAt: new Date(Date.now() + 3600_000) });
}

// ── Public ─────────────────────────────────────────────────────────────────
on("GET", "health", async () => ({ status: "ok", version: APP_VERSION }));

// ── Auth: SaveState ────────────────────────────────────────────────────────
on("POST", "auth/savestate/login", async ({ req, body }) => {
  const b = await body();
  onlyKeys(b, ["identifier", "password"]);
  const identifier = text(b.identifier, 254, { required: true, field: "Username" });
  if (typeof b.password !== "string" || !b.password || b.password.length > 256) throw new HttpError(400, "Enter your password.");
  await loginLimit(req, null);
  try {
    const out = await signInWithSaveState(identifier, b.password);
    return out;
  } catch (e) {
    if (e instanceof HttpError && (e.code === "savestate_auth" || e.code === "not_linked")) await loginLimit(req, true);
    throw e;
  }
});

on("POST", "auth/savestate/link", async ({ req, body }) => {
  const m = await requireMember(req);
  const b = await body();
  onlyKeys(b, ["identifier", "password"]);
  const identifier = text(b.identifier, 254, { required: true, field: "Username" });
  if (typeof b.password !== "string" || !b.password) throw new HttpError(400, "Enter your SaveState password.");
  await loginLimit(req, null);
  try { return await linkSaveState(m.uid, identifier, b.password); }
  catch (e) { if (e instanceof HttpError && e.code === "savestate_auth") await loginLimit(req, true); throw e; }
});

on("POST", "auth/savestate/unlink", async ({ req }) => { const m = await requireMember(req); await unlinkSaveState(m.uid); return { ok: true }; });
on("POST", "auth/savestate/sync", async ({ req }) => ({ savestate: await syncSaveStateProfile((await requireMember(req)).uid) }));

// ── SaveState profile images ───────────────────────────────────────────────
async function profileOwner(req: ApiRequest, m: Member) {
  const uid = queryParam(req, "uid") || m.uid;
  if (uid !== m.uid) {
    const s = await adminDb().collection("users").doc(uid).get();
    if (!s.exists || !["admin", "sanctuary_owner", "partner"].includes(s.get("role"))) throw new HttpError(404, "No such member.");
  }
  return uid;
}

on("GET", "savestate/profile-images", async ({ req }) => {
  const m = await requireMember(req);
  const uid = await profileOwner(req, m);
  const imgs = await ss.profileImages(await saveStateToken(uid));
  // The partner sees only what the owner made public in SaveState.
  return { images: imgs.filter((i) => uid === m.uid || i.is_public).map((i) => ({ id: i.id, isPublic: !!i.is_public, uploadedAt: i.uploaded_at ?? null, caption: i.caption ?? "" })) };
});

on("GET", "savestate/profile-image", async ({ req, res }) => {
  const m = await requireMember(req);
  const uid = await profileOwner(req, m);
  const id = queryParam(req, "id");
  const token = await saveStateToken(uid);
  if (uid !== m.uid) {
    const imgs = await ss.profileImages(token);
    if (!imgs.some((i) => i.id === id && i.is_public)) throw new HttpError(404, "Image not available.");
  }
  await pipeMedia(res, await ss.profileImageFile(token, id), "image/jpeg");
  return STREAMED;
});

// ── Notifications ──────────────────────────────────────────────────────────
on("POST", "notify", async ({ req, body }) => {
  const m = await requireMember(req);
  const b = await body();
  onlyKeys(b, ["kind", "title", "body", "emailBody", "email", "push"]);
  if (!NOTIFY_KINDS.includes(b.kind)) throw new HttpError(400, "Unknown notification kind.");
  return notifyPartner(m, {
    kind: b.kind as NotifyKind,
    title: text(b.title, 160, { required: true, field: "title" }),
    body: text(b.body, 1000, { required: true, field: "body" }),
    emailBody: text(b.emailBody, 20_000),
    email: b.email !== false,
    push: b.push !== false,
  });
});

// ── AI ─────────────────────────────────────────────────────────────────────
on("POST", "ai/letter", async ({ req, body }) => {
  const m = await requireMember(req);
  const b = await body();
  onlyKeys(b, ["prompt", "context"]);
  const out = await draftLetter(text(b.prompt, 2000, { required: true, field: "prompt" }), text(b.context, 4000));
  void logEvent({ kind: "ai", actor: sideOf(m.role), summary: `letter draft via ${out.provider}` });
  return out;
});

// ── Memory Garden ──────────────────────────────────────────────────────────
on("POST", "memories", async ({ req, body }) => createMemory(await requireMember(req), await body()));
on("POST", "memories/media", async ({ req, body }) => {
  const m = await requireMember(req);
  const b = await body();
  return { media: await addMedia(m, text(b.memoryId, 120, { required: true }), b.file, b.thumbnail) };
});
on("POST", "memories/delete", async ({ req, body }) => {
  const m = await requireMember(req);
  await deleteMemory(m, text((await body()).id, 120, { required: true }));
  return { ok: true };
});
on("GET", "memories/media", async ({ req, res }) => {
  const m = await requireMember(req);
  const i = Number(queryParam(req, "i") || 0);
  const size = queryParam(req, "size") === "full" ? "full" : "thumb";
  const out = await mediaFor(m, queryParam(req, "id"), Number.isInteger(i) && i >= 0 ? i : 0, size);
  await pipeMedia(res, out.response, out.mime);
  return STREAMED;
});
on("GET", "memories/sources", async ({ req }) => sourcesStatus(await requireMember(req)));
on("GET", "memories/sources/savestate", async ({ req }) => previewSaveState(await requireMember(req), queryParam(req, "albumId") || undefined));
on("GET", "memories/sources/weddingapp", async ({ req }) => previewWedding(await requireMember(req)));
on("GET", "memories/sources/memory_book", async ({ req }) => previewInternal(await requireMember(req), "memory_book"));
on("GET", "memories/sources/letters", async ({ req }) => previewInternal(await requireMember(req), "letters"));
on("GET", "memories/sources/timeline", async ({ req }) => previewInternal(await requireMember(req), "timeline"));
on("POST", "memories/import", async ({ req, body }) => importRecords(await requireMember(req), await body()));
on("POST", "memories/sources/disconnect", async ({ req, body }) => {
  const b = await body();
  return disconnectSource(await requireMember(req), b.source as MemorySource, b.removeImported === true);
});
on("POST", "memories/sources/reconnect", async ({ req, body }) => {
  await reconnectSource(await requireMember(req), (await body()).source as MemorySource);
  return { ok: true };
});
on("POST", "memories/share-with-jarvis", async ({ req, body }) => {
  const m = await requireMember(req);
  const id = text((await body()).id, 120, { required: true });
  const s = await adminDb().collection("memories").doc(id).get();
  if (!s.exists || s.get("visibility") !== "shared") throw new HttpError(403, "Only shared memories can be given to Jarvis.");
  if (s.get("ownerId") !== m.uid) throw new HttpError(403, "Only the person who saved this memory can share it with Jarvis.");
  const r = await shareMemoryKnowledge({ id, title: s.get("title"), text: s.get("caption") || s.get("title"), date: s.get("memoryDate"), tags: s.get("tags") });
  if (!r.ok) throw new HttpError(502, `Jarvis did not take it: ${r.detail}`, "jarvis_unavailable");
  await s.ref.update({ sharedWithJarvisAt: FieldValue.serverTimestamp() });
  return { ok: true };
});

on("POST", "memory-book/share-with-jarvis", async ({ req, body }) => {
  const m = await requireMember(req);
  const id = text((await body()).id, 120, { required: true });
  const s = await adminDb().collection("memory_book").doc(id).get();
  if (!s.exists) throw new HttpError(404, "That Memory Book entry doesn't exist.");
  const r = await shareMemoryKnowledge({ id: `book-${id}`, title: s.get("title"), text: s.get("narrative") || s.get("title"), date: s.get("dateStr"), tags: s.get("tags") });
  if (!r.ok) {
    await s.ref.update({ syncStatus: "failed" });
    throw new HttpError(502, `Jarvis did not take it: ${r.detail}`, "jarvis_unavailable");
  }
  const syncedAt = new Date().toISOString();
  await s.ref.update({ syncStatus: "synced", syncedAt, externalBridgeId: `jarvis:book-${id}` });
  void logEvent({ kind: "memory", actor: sideOf(m.role), summary: "memory book entry shared with Jarvis" });
  return { ok: true, syncedAt };
});

// ── Jarvis → Cupid ─────────────────────────────────────────────────────────
const jarvisKey = (req: ApiRequest) => requireKey(req, env.jarvisApiKey, ["x-jarvis-key", "x-jarvis-api-key"], "Jarvis API key");

on("GET", "jarvis/health", async ({ req }) => {
  const authed = !!env.jarvisApiKey && [bearer(req), header(req, "x-jarvis-key")].some((k) => secretEquals(k, env.jarvisApiKey));
  return { status: "ok", application: "Project Cupid", version: APP_VERSION, authenticated: authed, ...(authed ? { tools: JARVIS_TOOLS.map((t) => t.name) } : {}) };
});
on("GET", "jarvis/tools", async ({ req }) => {
  jarvisKey(req);
  return { application: "Project Cupid", version: APP_VERSION, tools: JARVIS_TOOLS, privacy: "Shared memories only; wellbeing data and private memories are not reachable." };
});
on("POST", "jarvis/execute", async ({ req, body }) => {
  jarvisKey(req);
  const b = await body();
  const name = String(b.tool ?? b.toolName ?? "");
  if (!name) throw new HttpError(400, "Missing field: tool.");
  return { success: true, result: await executeTool(name, b.parameters ?? b.params ?? {}) };
});
on("POST", "jarvis/proposals/decide", async ({ req, body }) => {
  const m = await requireMember(req);
  const b = await body();
  return decideProposal(m.uid, text(b.id, 120, { required: true }), b.approve === true);
});

// ── Ecosystem → Memory Book ────────────────────────────────────────────────
const bridge: Handler = async ({ req, body }) => {
  requireKey(req, env.bridgeSecret, ["x-bridge-secret"], "bridge secret");
  return { success: true, ...(await acceptBridgeEntry(await body(), "ecosystem-bridge")) };
};
on("POST", "memory-book/sync", bridge);
on("POST", "bridge/favorite", bridge);

// ── Ecosystem status (what the Connections screen shows) ───────────────────
on("GET", "ecosystem/status", async ({ req }) => {
  const m = await requireMember(req);
  const day = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Johannesburg" });
  const [state, todays, savestate, linked] = await Promise.all([
    adminDb().collection("ecosystem_state").doc("jarvis").get(),
    adminDb().collection("ecosystem_log").where("day", "==", day).limit(500).get(),
    ss.health(),
    import("./identity.js").then((x) => x.hasSaveState(m.uid)),
  ]);
  const byKind: Record<string, number> = {};
  todays.docs.forEach((d) => { const k = String(d.get("kind")); byKind[k] = (byKind[k] ?? 0) + 1; });
  return {
    jarvis: {
      url: env.jarvisUrl,
      keyConfigured: !!env.jarvisEcosystemKey,
      inboundKeyConfigured: !!env.jarvisApiKey,
      lastPing: state.get("lastPing") ?? null,
      lastFlush: state.get("lastFlush") ?? null,
      lastCron: state.get("lastCron") ?? null,
    },
    savestate: { url: env.savestateUrl, reachable: savestate.up, detail: savestate.detail, linked },
    today: { day, events: todays.size, byKind },
    tools: JARVIS_TOOLS.map((t) => ({ name: t.name, description: t.description, category: t.category, needsApproval: !!t.needsApproval })),
  };
});
on("POST", "ecosystem/sync", async ({ req }) => { await requireAdmin(req); return cronSync(); });

// ── The ESP32 Love Lamp: a count, never content ────────────────────────────
on("GET", "lamp/status", async ({ req }) => {
  requireKey(req, env.lampKey, ["x-lamp-key"], "lamp key");
  const unread = await adminDb().collection("letters").where("isPublished", "==", true).where("isRead", "==", false).count().get();
  return { unreadLetters: unread.data().count };
});

// ── Operations ─────────────────────────────────────────────────────────────
const cronOrAdmin = async (req: ApiRequest) => {
  if (env.cronSecret && secretEquals(bearer(req), env.cronSecret)) return;
  await requireAdmin(req);
};
on("GET", "admin/diagnostics", async ({ req }) => { await cronOrAdmin(req); return runDiagnostics(); });
on("GET", "admin/data-audit", async ({ req }) => { await cronOrAdmin(req); return audit(); });
on("POST", "admin/migrate", async ({ req, body }) => {
  await cronOrAdmin(req);
  const b = await body();
  const dryRun = b.dryRun !== false;
  const steps: string[] = Array.isArray(b.steps) ? b.steps : ["roles", "garden"];
  return {
    roles: steps.includes("roles") ? await fixRoles(dryRun) : undefined,
    garden: steps.includes("garden") ? await carryOver(dryRun) : undefined,
  };
});
on("GET", "cron/daily", async ({ req }) => {
  await cronOrAdmin(req);
  const expired = await adminDb().collection("rate_limits").where("expiresAt", "<", new Date()).limit(400).get();
  const batch = adminDb().batch();
  expired.docs.forEach((d) => batch.delete(d.ref));
  if (!expired.empty) await batch.commit();
  return { ok: true, pruned: expired.size, ecosystem: await cronSync() };
});

// ── Plumbing ───────────────────────────────────────────────────────────────
const STREAMED = Symbol("streamed");

async function pipeMedia(res: ApiResponse, r: Response, mime: string) {
  res.statusCode = 200;
  res.setHeader("Content-Type", mime);
  res.setHeader("Cache-Control", "private, max-age=3600");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Disposition", "inline");
  const len = r.headers.get("content-length");
  if (len) res.setHeader("Content-Length", len);
  if (!r.body) { res.end(); return; }
  await new Promise<void>((resolve, reject) => {
    const s = Readable.fromWeb(r.body as any);
    s.on("error", reject);
    res.on("finish", () => resolve());
    res.on("close", () => resolve());
    s.pipe(res);
  });
}

/** The path after /api/, from a rewrite's `__p` query or the URL itself. */
export function routePath(req: ApiRequest): string {
  const p = queryParam(req, "__p") || new URL(req.url ?? "/", "http://local").pathname.replace(/^\/api\/?/, "");
  return p.replace(/^\/+|\/+$/g, "");
}

export async function handle(req: ApiRequest, res: ApiResponse) {
  const path = routePath(req);
  const method = req.method === "HEAD" ? "GET" : (req.method ?? "GET");
  const h = routes.get(`${method} ${path}`);
  if (!h) {
    const exists = [...routes.keys()].some((k) => k.endsWith(` ${path}`));
    return sendJson(res, exists ? 405 : 404, { error: exists ? "Method not allowed." : "No such API route." });
  }
  try {
    let cached: Record<string, any> | undefined;
    const out = await h({ req, res, body: async () => (cached ??= await jsonBody(req)) });
    if (out !== STREAMED) sendJson(res, 200, out ?? { ok: true });
  } catch (e: any) {
    if (e instanceof HttpError) return sendJson(res, e.status, { error: e.message, code: e.code, ...(e.extra ?? {}) });
    if (e instanceof AdminUnavailableError) return sendJson(res, 503, { error: "The server's Firebase credentials are not configured.", code: "not_configured" });
    console.error(`[api] ${method} ${path} failed:`, e?.message ?? e);
    sendJson(res, 500, { error: "Something went wrong on the server. Please try again." });
  }
}

export const routeList = () => [...routes.keys()];
