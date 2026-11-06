/**
 * Project Cupid in the Jarvis ecosystem.
 *
 * Jarvis (Second Brain, jarvis.savestate.co.za) knows an app through its
 * integration key (jb_live_sk_…, permissions ingest_events + read_logs):
 *   - heartbeat  POST /api/ecosystem/integrations/ping   → the monitor shows Cupid as live
 *   - knowledge  POST /api/ecosystem/knowledge           → documents Jarvis can search
 *
 * Cupid's activity log goes to Jarvis as one knowledge document per day
 * ("Project Cupid activity — 2026-11-05"), rewritten as the day goes on.
 *
 * What a log line may contain is deliberately narrow: an event kind, who
 * (him/her/jarvis/system) and counts. Never letter text, memory captions,
 * wellbeing data or email addresses.
 */
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./firebaseAdmin.js";
import { APP_VERSION, env } from "./config.js";
import { fetchWithTimeout } from "./http.js";

export type EventKind = "auth" | "notify" | "memory" | "jarvis" | "bridge" | "import" | "system" | "ai";

export interface CupidEvent {
  kind: EventKind;
  summary: string;
  severity?: "info" | "warn" | "error";
  actor?: "him" | "her" | "jarvis" | "system";
}

const PING_EVERY_MS = 5 * 60_000;
const FLUSH_EVERY_MS = 10 * 60_000;

const today = (d = new Date()) => d.toLocaleDateString("en-CA", { timeZone: "Africa/Johannesburg" });

/** Record an event. Never throws: logging must not break the action it describes. */
export async function logEvent(e: CupidEvent): Promise<void> {
  try {
    await adminDb().collection("ecosystem_log").add({
      at: FieldValue.serverTimestamp(),
      day: today(),
      kind: e.kind,
      severity: e.severity ?? "info",
      actor: e.actor ?? "system",
      summary: String(e.summary).slice(0, 200),
    });
    await maybeSync();
  } catch (err: any) {
    console.warn("[ecosystem] could not record event:", err?.message ?? err);
  }
}

async function jarvis(path: string, body: unknown): Promise<{ ok: boolean; status: number; detail: string }> {
  const key = env.jarvisEcosystemKey;
  if (!key) return { ok: false, status: 0, detail: "JARVIS_ECOSYSTEM_KEY is not set" };
  try {
    const r = await fetchWithTimeout(env.jarvisUrl + path, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Jarvis-Api-Key": key },
      body: JSON.stringify(body),
      timeoutMs: 6000,
    });
    const b: any = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, detail: r.ok ? "ok" : String(b?.error ?? r.statusText).slice(0, 200) };
  } catch (e: any) {
    return { ok: false, status: 0, detail: e?.name === "TimeoutError" ? "Jarvis did not answer in 6 s" : "Jarvis not reachable" };
  }
}

export async function heartbeat(events = 0) {
  return jarvis("/api/ecosystem/integrations/ping", {
    status: "ok",
    version: APP_VERSION,
    events,
    metrics: { app: "project-cupid" },
  });
}

/** Rewrites today's activity document in Jarvis from Cupid's own log. */
export async function flushDay(day = today()) {
  const snap = await adminDb().collection("ecosystem_log").where("day", "==", day).orderBy("at", "asc").limit(500).get();
  const lines = snap.docs.map((d) => {
    const at = d.get("at")?.toDate?.() as Date | undefined;
    const time = at ? at.toLocaleTimeString("en-GB", { timeZone: "Africa/Johannesburg", hour: "2-digit", minute: "2-digit" }) : "--:--";
    return `${time}  [${d.get("kind")}${d.get("severity") !== "info" ? "/" + d.get("severity") : ""}] ${d.get("actor")}: ${d.get("summary")}`;
  });
  if (!lines.length) return { ok: true, status: 204, detail: "nothing to send", events: 0 };
  const content = [
    `Project Cupid activity log for ${day} (Africa/Johannesburg).`,
    "Only event types and counts are recorded here; private content and wellbeing data are never included.",
    "",
    ...lines,
  ].join("\n");
  const r = await jarvis("/api/ecosystem/knowledge", {
    externalId: `project-cupid-activity-${day}`,
    title: `Project Cupid activity — ${day}`,
    content,
  });
  return { ...r, events: lines.length };
}

/** Shares one *shared* memory with Jarvis as searchable knowledge. */
export async function shareMemoryKnowledge(m: { id: string; title: string; text: string; date?: string; tags?: string[] }) {
  return jarvis("/api/ecosystem/knowledge", {
    externalId: `project-cupid-memory-${m.id}`,
    title: `Our memory: ${m.title}`.slice(0, 300),
    content: [m.date ? `Date: ${m.date}` : "", m.tags?.length ? `Tags: ${m.tags.join(", ")}` : "", "", m.text].filter((x, i) => x || i > 1).join("\n").slice(0, 20_000),
  });
}

async function maybeSync() {
  if (!env.jarvisEcosystemKey) return;
  const ref = adminDb().collection("ecosystem_state").doc("jarvis");
  const now = Date.now();
  const due = await adminDb().runTransaction(async (tx) => {
    const s = await tx.get(ref);
    const ping = now - Number(s.get("lastPingAt") ?? 0) > PING_EVERY_MS;
    const flush = now - Number(s.get("lastFlushAt") ?? 0) > FLUSH_EVERY_MS;
    if (ping || flush) tx.set(ref, { ...(ping ? { lastPingAt: now } : {}), ...(flush ? { lastFlushAt: now } : {}) }, { merge: true });
    return { ping, flush };
  });
  if (due.ping) {
    const r = await heartbeat(1);
    await ref.set({ lastPing: { at: now, ok: r.ok, detail: r.detail } }, { merge: true });
  }
  if (due.flush) {
    const r = await flushDay();
    await ref.set({ lastFlush: { at: now, ok: r.ok, detail: r.detail, events: r.events } }, { merge: true });
  }
}

/** Daily cron: yesterday's log in full, today's so far, and a heartbeat. */
export async function cronSync() {
  const y = new Date(Date.now() - 24 * 3600_000);
  const results = {
    heartbeat: await heartbeat(0),
    yesterday: await flushDay(today(y)),
    today: await flushDay(),
  };
  await adminDb().collection("ecosystem_state").doc("jarvis").set(
    { lastCron: { at: Date.now(), ok: results.heartbeat.ok, detail: results.heartbeat.detail } },
    { merge: true },
  );
  return results;
}
