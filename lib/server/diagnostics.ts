/**
 * Live credential and integration checks, run inside the deployment where the
 * secrets actually live. Results name what works and what does not; no secret
 * value (or any part of one) is ever included.
 */
import { adminAuth, adminDb, adminMessaging, adminStatus } from "./firebaseAdmin.js";
import { env, FIRESTORE_DATABASE_ID } from "./config.js";
import { fetchWithTimeout } from "./http.js";
import { gemini } from "./ai.js";
import * as ss from "./savestate.js";
import { getFirestore } from "firebase-admin/firestore";
import { getApps } from "firebase-admin/app";

type Check = { ok: boolean; detail: string };
const safe = async (f: () => Promise<Check>): Promise<Check> => {
  try { return await f(); } catch (e: any) { return { ok: false, detail: String(e?.message ?? e).slice(0, 240) }; }
};
const present = (v: string, min = 1): Check => ({ ok: v.length >= min, detail: v ? (v.length >= min ? "set" : `set but too short (${v.length} chars)`) : "not set" });

export async function runDiagnostics() {
  const checks: Record<string, Check> = {};

  checks.firebase_admin = { ok: adminStatus().ready, detail: adminStatus().ready ? "service account loaded" : adminStatus().error ?? "not ready" };
  if (adminStatus().ready) {
    checks.firestore_named_db = await safe(async () => {
      const users = await adminDb().collection("users").get();
      const roles: Record<string, number> = {};
      users.docs.forEach((d) => { const r = String(d.get("role") ?? "none"); roles[r] = (roles[r] ?? 0) + 1; });
      return { ok: true, detail: `${FIRESTORE_DATABASE_ID}: ${users.size} user profiles ${JSON.stringify(roles)}` };
    });
    checks.firestore_default_db = await safe(async () => {
      const app = getApps().find((a) => a.name === "cupid")!;
      try {
        const n = (await getFirestore(app).collection("users").limit(5).get()).size;
        return { ok: true, detail: n ? `(default) also has user profiles (${n}+) — the app reads only the named database` : "(default) has no user profiles (expected)" };
      } catch {
        return { ok: true, detail: "(default) isn't readable on this plan; the app reads only the named database" };
      }
    });
    checks.auth = await safe(async () => {
      const list = await adminAuth().listUsers(50);
      const providers: Record<string, number> = {};
      list.users.forEach((u) => { const p = u.providerData[0]?.providerId ?? "anonymous"; providers[p] = (providers[p] ?? 0) + 1; });
      await adminAuth().createCustomToken("diagnostics-probe");
      return { ok: true, detail: `${list.users.length} accounts ${JSON.stringify(providers)}; custom tokens can be minted` };
    });
    checks.fcm = await safe(async () => {
      try {
        await adminMessaging().send({ token: "diagnostics-invalid-token", notification: { title: "x" } }, true);
        return { ok: true, detail: "accepted (unexpected for a fake token)" };
      } catch (e: any) {
        const code = String(e?.code ?? "");
        if (/invalid-argument|invalid-registration-token|registration-token-not-registered/.test(code)) return { ok: true, detail: "credentials accepted by FCM (fake token rejected as expected)" };
        return { ok: false, detail: code || e?.message };
      }
    });
    checks.cupid_album = await safe(async () => {
      const id = (await adminDb().collection("integration_config").doc("savestate").get()).get("albumId");
      return { ok: true, detail: id ? "SaveState album created" : "not created yet (made on first upload)" };
    });
  }

  checks.resend = await safe(async () => {
    if (!env.resendKey) return { ok: false, detail: "RESEND_API_KEY not set (mail still goes through SaveState)" };
    const r = await fetchWithTimeout(`${env.resendApi}/domains`, { headers: { Authorization: `Bearer ${env.resendKey}` }, timeoutMs: 8000 });
    const b: any = await r.json().catch(() => ({}));
    if (r.status === 401 || r.status === 403) return { ok: false, detail: `Resend refused the key (${b?.name ?? r.status})` };
    if (!r.ok) {
      // Sending-only keys cannot list domains; that is fine.
      return { ok: r.status === 400 || r.status === 405 ? true : false, detail: `domains list answered ${r.status} (${b?.name ?? ""}); a sending-only key cannot list domains` };
    }
    const fromDomain = (env.resendFrom.match(/@([^>\s]+)/) ?? [])[1];
    const d = (b?.data ?? []).find((x: any) => x.name === fromDomain);
    return { ok: d?.status === "verified" || d?.status === "partially_verified", detail: d ? `sender domain ${fromDomain}: ${d.status}` : `sender domain ${fromDomain} is not in this Resend account` };
  });
  checks.gemini = await safe(async () => {
    const out = await gemini("Reply with the single word: ready", "Answer in one word.", 15_000);
    return { ok: true, detail: `${env.geminiModel} answered (${out.slice(0, 20)})` };
  });
  checks.savestate = await safe(async () => { const h = await ss.health(); return { ok: h.up, detail: h.detail }; });
  checks.jarvis = await safe(async () => {
    if (!env.jarvisEcosystemKey) return { ok: false, detail: "JARVIS_ECOSYSTEM_KEY not set" };
    const r = await fetchWithTimeout(`${env.jarvisUrl}/api/ecosystem/integrations/ping`, { headers: { "X-Jarvis-Api-Key": env.jarvisEcosystemKey }, timeoutMs: 8000 });
    const b: any = await r.json().catch(() => ({}));
    return r.ok ? { ok: true, detail: `authenticated as ${b?.app?.name ?? "?"} (${(b?.app?.permissions ?? []).join(", ")})` } : { ok: false, detail: `Jarvis answered ${r.status}` };
  });
  checks.weddingapp = await safe(async () => {
    const r = await fetchWithTimeout(`${env.weddingUrl}/api/media?visibility=public&count=1`, { timeoutMs: 10_000 });
    const b: any = await r.json().catch(() => ({}));
    return { ok: r.ok && b?.configured !== false, detail: r.ok ? `${b?.count ?? "?"} public photos and videos` : `answered ${r.status}` };
  });

  checks.jarvis_api_key = present(env.jarvisApiKey, 32);
  checks.bridge_secret = present(env.bridgeSecret, 32);
  checks.session_secret = present(env.sessionSecret, 32);
  checks.album_pin = present(env.savestateAlbumPin, 16);
  checks.cron_secret = present(env.cronSecret, 32);
  checks.vapid_key = present((process.env.VITE_FIREBASE_VAPID_KEY ?? "").trim(), 80);
  checks.savestate_links = { ok: true, detail: `${Object.keys(env.savestateLinks).length} pre-approved link(s)` };

  const ok = Object.values(checks).every((c) => c.ok);
  return { ok, at: new Date().toISOString(), checks };
}
