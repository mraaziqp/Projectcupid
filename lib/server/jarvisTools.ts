/**
 * The tools Jarvis may call on Project Cupid.
 *
 * Before 5.0 these ran the *browser* Firebase SDK on the server with no
 * signed-in user, so Firestore refused every write — and the errors were
 * swallowed and reported as success. They now run with Firebase Admin, and:
 *   - only tools in this registry exist; each has a strict parameter schema,
 *   - reads are limited to shared memories and the shared timeline,
 *   - wellbeing collections are not reachable from any tool,
 *   - anything that would change an existing memory becomes a *proposal*
 *     that a member approves in the app,
 *   - every call is written to the append-only jarvis_audit_logs.
 */
import { FieldValue, type DocumentData } from "firebase-admin/firestore";
import { adminDb } from "./firebaseAdmin.js";
import { APP_VERSION } from "./config.js";
import { HttpError } from "./http.js";
import { logEvent } from "./ecosystem.js";
import { normaliseTags, pickDailyMemory, type Memory } from "../../src/lib/memoryGarden/model.js";

type ParamSpec = { type: "string" | "number" | "boolean" | "array"; description: string; max?: number; enum?: string[] };
export interface JarvisTool {
  name: string;
  description: string;
  category: "shared_content" | "appreciation" | "planning" | "system" | "memory_garden";
  /** Changes an existing record: never applied directly, only proposed. */
  needsApproval?: boolean;
  parameters: { type: "object"; properties: Record<string, ParamSpec>; required: string[] };
}

const S = (description: string, max = 500): ParamSpec => ({ type: "string", description, max });

export const JARVIS_TOOLS: JarvisTool[] = [
  { name: "cupid_get_status", description: "Project Cupid health and which tools are enabled.", category: "system", parameters: { type: "object", properties: {}, required: [] } },
  { name: "cupid_add_memory", description: "Add a shared milestone to the Our Story timeline.", category: "shared_content",
    parameters: { type: "object", properties: { date: S("Date or era, e.g. 2026-09-06 or 'October 2025'", 40), title: S("Title", 120), description: S("What happened", 2000), reflection: S("Optional reflection", 1000) }, required: ["date", "title", "description"] } },
  { name: "cupid_draft_letter", description: "Save a draft letter for Raaziq to review. Drafts are never published by Jarvis.", category: "shared_content",
    parameters: { type: "object", properties: { title: S("Title", 120), content: S("Markdown text", 10000), category: S("Theme", 80) }, required: ["title", "content"] } },
  { name: "cupid_add_message_box", description: "Add a message to the daily message boxes.", category: "shared_content",
    parameters: { type: "object", properties: { content: S("The message", 1000), title: S("Optional title", 120), category: S("Love, Compliments, Encouragement, Funny, Inside jokes, Memories", 40), isSecret: { type: "boolean", description: "Hidden until opened" } }, required: ["content", "category"] } },
  { name: "cupid_add_appreciation", description: "Add a reason to the 365 Reasons vault.", category: "appreciation",
    parameters: { type: "object", properties: { text: S("The reason", 500) }, required: ["text"] } },
  { name: "cupid_add_dream", description: "Add a dream to the shared dream board.", category: "planning",
    parameters: { type: "object", properties: { title: S("Title", 120), description: S("The dream", 1000), isCostNothing: { type: "boolean", description: "Free dream" }, category: S("Home, Travel, Experiences, Free, Family", 40) }, required: ["title", "description"] } },
  { name: "cupid_add_date_idea", description: "Add a date idea to the planner.", category: "planning",
    parameters: { type: "object", properties: { title: S("Title", 120), description: S("Details", 1000), category: S("Free, At-Home, Outdoor, Conversation, Creative", 40) }, required: ["title", "description"] } },
  { name: "cupid_get_shared_memories", description: "Recent shared milestones from Our Story.", category: "shared_content",
    parameters: { type: "object", properties: { limit: { type: "number", description: "1-25, default 10" } }, required: [] } },

  // Memory Garden (shared memories only)
  { name: "cupid_find_shared_memories", description: "Search shared Memory Garden memories by text, year or tag.", category: "memory_garden",
    parameters: { type: "object", properties: { query: S("Words to look for", 80), year: { type: "number", description: "e.g. 2026" }, tag: S("A tag", 32), limit: { type: "number", description: "1-25" } }, required: [] } },
  { name: "cupid_get_memory", description: "One shared memory by id.", category: "memory_garden",
    parameters: { type: "object", properties: { id: S("Memory id", 120) }, required: ["id"] } },
  { name: "cupid_memories_on_date", description: "Shared memories on a calendar day across years (anniversaries), or on an exact date.", category: "memory_garden",
    parameters: { type: "object", properties: { date: S("MM-DD or YYYY-MM-DD", 10) }, required: ["date"] } },
  { name: "cupid_suggest_tags", description: "Suggest tags for a shared memory (read-only suggestion).", category: "memory_garden",
    parameters: { type: "object", properties: { id: S("Memory id", 120) }, required: ["id"] } },
  { name: "cupid_suggest_collection", description: "Suggest which collection a shared memory fits (read-only suggestion).", category: "memory_garden",
    parameters: { type: "object", properties: { id: S("Memory id", 120) }, required: ["id"] } },
  { name: "cupid_suggest_daily_memory", description: "Today's daily memory, as the app would show it.", category: "memory_garden",
    parameters: { type: "object", properties: {}, required: [] } },
  { name: "cupid_propose_memory_change", description: "Propose a caption, tags or a collection for a shared memory. A member must approve it in the app.", category: "memory_garden", needsApproval: true,
    parameters: { type: "object", properties: { id: S("Memory id", 120), caption: S("Proposed caption", 2000), addTags: { type: "array", description: "Tags to add (max 8)", max: 8 }, collectionId: S("Collection to add it to", 120), reason: S("Why", 300) }, required: ["id"] } },
];

const REGISTRY = new Map(JARVIS_TOOLS.map((t) => [t.name, t]));

/** Throws on anything the schema does not allow, including unknown fields. */
export function validateParams(tool: JarvisTool, params: unknown): Record<string, any> {
  if (params === undefined || params === null) params = {};
  if (typeof params !== "object" || Array.isArray(params)) throw new HttpError(400, "parameters must be an object.");
  const p = params as Record<string, unknown>;
  for (const k of Object.keys(p)) if (!tool.parameters.properties[k]) throw new HttpError(400, `Unknown parameter '${k}' for ${tool.name}.`);
  for (const r of tool.parameters.required) if (p[r] === undefined || p[r] === "") throw new HttpError(400, `Missing parameter '${r}'.`);
  const out: Record<string, any> = {};
  for (const [k, spec] of Object.entries(tool.parameters.properties)) {
    const v = p[k];
    if (v === undefined) continue;
    if (spec.type === "string") {
      if (typeof v !== "string") throw new HttpError(400, `'${k}' must be a string.`);
      if (spec.max && v.length > spec.max) throw new HttpError(400, `'${k}' is longer than ${spec.max} characters.`);
      out[k] = v.trim();
    } else if (spec.type === "number") {
      if (typeof v !== "number" || !Number.isFinite(v)) throw new HttpError(400, `'${k}' must be a number.`);
      out[k] = v;
    } else if (spec.type === "boolean") {
      if (typeof v !== "boolean") throw new HttpError(400, `'${k}' must be true or false.`);
      out[k] = v;
    } else if (spec.type === "array") {
      if (!Array.isArray(v) || (spec.max && v.length > spec.max)) throw new HttpError(400, `'${k}' must be a list of at most ${spec.max}.`);
      out[k] = v;
    }
  }
  return out;
}

const db = () => adminDb();

async function audit(action: string, status: "success" | "rejected" | "error", summary: string, params?: unknown) {
  await db().collection("jarvis_audit_logs").add({
    action, status, resultSummary: summary.slice(0, 300),
    parameters: params ? JSON.stringify(params).slice(0, 500) : null,
    timestamp: FieldValue.serverTimestamp(),
  }).catch(() => {});
}

function publicMemory(id: string, m: DocumentData) {
  return {
    id, title: m.title, caption: m.caption, memoryDate: m.memoryDate, mediaType: m.mediaType, tags: m.tags ?? [],
    isSpecialOccasion: !!m.isSpecialOccasion, source: m.source, collectionIds: m.collectionIds ?? [], hasMedia: (m.media ?? []).length > 0,
  };
}

async function sharedMemory(id: string) {
  if (!/^[A-Za-z0-9_-]{1,120}$/.test(id)) throw new HttpError(400, "Invalid memory id.");
  const s = await db().collection("memories").doc(id).get();
  // A private memory is reported exactly like a missing one.
  if (!s.exists || s.get("visibility") !== "shared") throw new HttpError(404, "No shared memory with that id.");
  return s;
}

async function sharedMemories(limit = 400) {
  const snap = await db().collection("memories").where("visibility", "==", "shared").limit(limit).get();
  return snap.docs;
}

export async function executeTool(name: string, rawParams: unknown) {
  const tool = REGISTRY.get(name);
  if (!tool) {
    await audit(name.slice(0, 80), "rejected", "tool not in registry");
    throw new HttpError(403, `Tool '${name}' is not available to Jarvis.`, "tool_forbidden");
  }
  let p: Record<string, any>;
  try { p = validateParams(tool, rawParams); } catch (e: any) {
    await audit(name, "rejected", e?.message ?? "invalid parameters");
    throw e;
  }

  try {
    const result = await run(name, p);
    await audit(name, "success", typeof result?.message === "string" ? result.message : "ok", p);
    void logEvent({ kind: "jarvis", actor: "jarvis", summary: `tool ${name} ok` });
    return result;
  } catch (e: any) {
    await audit(name, e instanceof HttpError && e.status < 500 ? "rejected" : "error", e?.message ?? "error", p);
    void logEvent({ kind: "jarvis", actor: "jarvis", severity: "warn", summary: `tool ${name} failed` });
    throw e;
  }
}

async function add(coll: string, data: Record<string, any>) {
  const ref = db().collection(coll).doc();
  await ref.set({ id: ref.id, ...data, createdAt: FieldValue.serverTimestamp() });
  return ref.id;
}

async function run(name: string, p: Record<string, any>): Promise<any> {
  switch (name) {
    case "cupid_get_status":
      return { application: "Project Cupid", version: APP_VERSION, tools: JARVIS_TOOLS.map((t) => t.name), privacy: "Shared memories only. Wellbeing data and private memories are not reachable." };

    case "cupid_add_memory":
      return { memoryId: await add("timeline_moments", { date: p.date, title: p.title, description: p.description, reflection: p.reflection || "", category: "milestone", source: "jarvis" }), message: "Added to Our Story" };

    case "cupid_draft_letter":
      return { letterId: await add("letters", { title: p.title, content: p.content, category: p.category || "Open when you need reassurance", isPublished: false, isFavorite: false, isRead: false, authorId: "jarvis", authorName: "Draft by Jarvis", publishDate: FieldValue.serverTimestamp() }), message: "Draft saved for review; not published" };

    case "cupid_add_message_box":
      return { messageId: await add("message_boxes", { title: p.title || null, content: p.content, category: p.category, authorId: "jarvis", authorName: "Raaziq", authorRole: "admin", isAnonymous: false, isSecret: p.isSecret !== false, isOpened: false, isFavorite: false, source: "jarvis" }), message: "Message added" };

    case "cupid_add_appreciation":
      return { reasonId: await add("reasons_vault", { text: p.text, author: "Raaziq", authorId: "jarvis", isFavorite: false, dateAdded: FieldValue.serverTimestamp(), source: "jarvis" }), message: "Reason added" };

    case "cupid_add_dream":
      return { dreamId: await add("dream_board", { title: p.title, description: p.description, category: p.category || (p.isCostNothing ? "Free" : "Experiences"), isCostNothing: !!p.isCostNothing, progress: 0, isCompleted: false, source: "jarvis" }), message: "Dream added" };

    case "cupid_add_date_idea":
      return { dateId: await add("date_plans", { title: p.title, description: p.description, category: p.category || "Free", isCompleted: false, source: "jarvis" }), message: "Date idea added" };

    case "cupid_get_shared_memories": {
      const n = Math.min(25, Math.max(1, Math.floor(p.limit ?? 10)));
      const snap = await db().collection("timeline_moments").orderBy("createdAt", "desc").limit(n).get();
      return { memories: snap.docs.map((d) => ({ id: d.id, date: d.get("date"), title: d.get("title"), description: d.get("description") })), message: `${snap.size} milestones` };
    }

    case "cupid_find_shared_memories": {
      const n = Math.min(25, Math.max(1, Math.floor(p.limit ?? 10)));
      const q = String(p.query ?? "").toLowerCase();
      const tag = String(p.tag ?? "").toLowerCase();
      const found = (await sharedMemories())
        .map((d) => publicMemory(d.id, d.data()))
        .filter((m) => (!p.year || m.memoryDate?.startsWith(String(p.year))) && (!tag || m.tags.includes(tag)) && (!q || `${m.title} ${m.caption}`.toLowerCase().includes(q)))
        .sort((a, b) => (a.memoryDate < b.memoryDate ? 1 : -1))
        .slice(0, n);
      return { memories: found, message: `${found.length} shared memories` };
    }

    case "cupid_get_memory": {
      const s = await sharedMemory(p.id);
      return { memory: publicMemory(s.id, s.data()!), message: "found" };
    }

    case "cupid_memories_on_date": {
      if (!/^(\d{4}-)?\d{2}-\d{2}$/.test(p.date)) throw new HttpError(400, "date must be MM-DD or YYYY-MM-DD.");
      const exact = p.date.length === 10;
      const found = (await sharedMemories())
        .map((d) => publicMemory(d.id, d.data()))
        .filter((m) => (exact ? m.memoryDate === p.date : m.memoryDate?.slice(5) === p.date));
      return { memories: found, message: `${found.length} on ${p.date}` };
    }

    case "cupid_suggest_tags": {
      const s = await sharedMemory(p.id);
      const m = s.data()!;
      const vocab = new Map<string, number>();
      for (const d of await sharedMemories()) for (const t of d.get("tags") ?? []) vocab.set(t, (vocab.get(t) ?? 0) + 1);
      const words = `${m.title} ${m.caption}`.toLowerCase();
      const suggestions = [...vocab.keys()].filter((t) => !(m.tags ?? []).includes(t) && words.includes(t)).slice(0, 6);
      if (m.isSpecialOccasion && !(m.tags ?? []).includes("special")) suggestions.push("special");
      return { suggestions, message: `${suggestions.length} suggestions (not applied)` };
    }

    case "cupid_suggest_collection": {
      const s = await sharedMemory(p.id);
      const tags: string[] = s.get("tags") ?? [];
      const cols = await db().collection("memory_collections").where("visibility", "==", "shared").get();
      const scored = await Promise.all(cols.docs.map(async (c) => {
        const members = await db().collection("memories").where("visibility", "==", "shared").where("collectionIds", "array-contains", c.id).limit(50).get();
        let score = 0;
        members.docs.forEach((d) => (d.get("tags") ?? []).forEach((t: string) => { if (tags.includes(t)) score++; }));
        return { id: c.id, name: c.get("name"), score };
      }));
      const best = scored.filter((x) => x.score > 0 && !(s.get("collectionIds") ?? []).includes(x.id)).sort((a, b) => b.score - a.score).slice(0, 3);
      return { suggestions: best, message: `${best.length} suggestions (not applied)` };
    }

    case "cupid_suggest_daily_memory": {
      const date = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Johannesburg" });
      const list = (await sharedMemories()).map((d) => ({ id: d.id, ...d.data() }) as unknown as Memory);
      const pick = pickDailyMemory(list, { date });
      return pick ? { memory: publicMemory(pick.memory.id, pick.memory), category: pick.category, message: "today's memory" } : { memory: null, message: "no shared memories yet" };
    }

    case "cupid_propose_memory_change": {
      const s = await sharedMemory(p.id);
      const change: Record<string, any> = {};
      if (p.caption) change.caption = p.caption;
      if (p.addTags) change.addTags = normaliseTags(p.addTags);
      if (p.collectionId) {
        const c = await db().collection("memory_collections").doc(p.collectionId).get();
        if (!c.exists || c.get("visibility") !== "shared") throw new HttpError(404, "No shared collection with that id.");
        change.collectionId = p.collectionId;
      }
      if (!Object.keys(change).length) throw new HttpError(400, "Propose a caption, tags or a collection.");
      const id = await add("jarvis_proposals", { memoryId: s.id, memoryOwnerId: s.get("ownerId"), change, reason: p.reason || "", status: "pending" });
      return { proposalId: id, status: "pending", message: "Proposal waiting for approval in Project Cupid" };
    }
  }
  throw new HttpError(403, "Tool not available.");
}

/** A member approves or declines one of Jarvis's proposals. Only the memory's owner can approve. */
export async function decideProposal(uid: string, proposalId: string, approve: boolean) {
  const ref = db().collection("jarvis_proposals").doc(proposalId);
  return db().runTransaction(async (tx) => {
    const pr = await tx.get(ref);
    if (!pr.exists || pr.get("status") !== "pending") throw new HttpError(404, "No pending proposal with that id.");
    if (pr.get("memoryOwnerId") !== uid) throw new HttpError(403, "Only the person who saved the memory can decide this.");
    const memRef = db().collection("memories").doc(pr.get("memoryId"));
    const mem = await tx.get(memRef);
    if (approve && mem.exists && mem.get("visibility") === "shared") {
      const c = pr.get("change") ?? {};
      tx.update(memRef, {
        ...(c.caption ? { caption: c.caption } : {}),
        ...(c.addTags?.length ? { tags: FieldValue.arrayUnion(...c.addTags) } : {}),
        ...(c.collectionId ? { collectionIds: FieldValue.arrayUnion(c.collectionId) } : {}),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    tx.update(ref, { status: approve ? "approved" : "declined", decidedBy: uid, decidedAt: FieldValue.serverTimestamp() });
    return { status: approve ? "approved" : "declined" };
  });
}
