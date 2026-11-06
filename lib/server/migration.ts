/**
 * Carrying 4.x data into 5.0.
 *
 * - audit():       who is who and how many records each collection holds (no content).
 * - fixRoles():    gives the three allowlisted Google accounts their intended role.
 *                  4.x created some profiles as "reader", which 5.0 no longer treats as a member.
 *                  Nothing else is changed; anyone not on the allowlist keeps whatever role they had
 *                  (and so stays locked out).
 * - carryOver():   copies Memory Book entries and Our Story moments into the Memory Garden as
 *                  shared memories (they were already shared between you). Idempotent: running it
 *                  twice adds nothing. The originals are left exactly where they are.
 *
 * Every function is safe to run repeatedly.
 */
import { FieldValue, type DocumentSnapshot } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "./firebaseAdmin.js";
import { BOOTSTRAP_MEMBERS, MEMBER_ROLES } from "./config.js";
import { importDocId } from "../../src/lib/memoryGarden/model.js";
import { internalMemoryFields } from "./memories.js";
import { logEvent } from "./ecosystem.js";

export const COLLECTIONS = [
  "users", "letters", "letter_replies", "vault", "message_boxes", "daily_box_selections", "reasons_vault", "safe_space_items",
  "timeline_moments", "shared_moments", "audio_memories", "dream_board", "future_letters", "date_plans", "marriage_traditions",
  "time_capsules", "love_vouchers", "surprise_items", "daily_acts", "weather", "us_drops", "care_quests", "notifications",
  "memory_book", "daily_welcome_status", "jarvis_audit_logs", "jarvis_events", "notificationLogs",
  "cycle_logs", "wellbeing_symptoms", "wellbeing_moods", "wellbeing_medications", "wellbeing_appointments", "wellbeing_journal", "wellbeing_settings",
  "memories", "memory_perspectives", "memory_reactions", "memory_collections", "daily_memory", "identity_links",
];

/** Email for a profile: the field, or the Firebase Auth account when the field is missing. */
async function emailOf(uid: string, field: unknown): Promise<string> {
  if (typeof field === "string" && field) return field.toLowerCase();
  try { return ((await adminAuth().getUser(uid)).email ?? "").toLowerCase(); } catch { return ""; }
}

export async function audit() {
  const db = adminDb();
  const users = await db.collection("users").get();
  const people = await Promise.all(users.docs.map(async (d) => {
    const email = await emailOf(d.id, d.get("email"));
    let provider = "unknown";
    try { provider = (await adminAuth().getUser(d.id)).providerData[0]?.providerId ?? "anonymous"; } catch { provider = "no auth account"; }
    return {
      uid: d.id, email: email || null, provider, role: d.get("role") ?? null, displayName: d.get("displayName") ?? null,
      intendedRole: BOOTSTRAP_MEMBERS[email]?.role ?? null,
      member: (MEMBER_ROLES as readonly string[]).includes(d.get("role")),
      hasPush: !!d.get("fcmToken"), savestate: d.get("savestate.username") ?? null,
    };
  }));
  const counts: Record<string, number | string> = {};
  await Promise.all(COLLECTIONS.map(async (c) => {
    try { counts[c] = (await db.collection(c).count().get()).data().count; } catch (e: any) { counts[c] = `error: ${e?.message ?? e}`; }
  }));
  // Wellbeing records per owner, so we can see they still belong to the right person (counts only).
  const wellbeingOwners: Record<string, Record<string, number>> = {};
  for (const c of ["cycle_logs", "wellbeing_symptoms", "wellbeing_moods", "wellbeing_medications", "wellbeing_appointments", "wellbeing_journal"]) {
    const s = await db.collection(c).select("userId").get();
    for (const d of s.docs) {
      const owner = String(d.get("userId") ?? "none");
      wellbeingOwners[owner] ??= {};
      wellbeingOwners[owner][c] = (wellbeingOwners[owner][c] ?? 0) + 1;
    }
  }
  return { people, counts, wellbeingOwners };
}

export async function fixRoles(dryRun: boolean) {
  const db = adminDb();
  const users = await db.collection("users").get();
  const changes: Array<{ uid: string; email: string; from: string | null; to: string }> = [];
  for (const d of users.docs) {
    const email = await emailOf(d.id, d.get("email"));
    const intended = BOOTSTRAP_MEMBERS[email];
    if (!intended) continue;
    if (d.get("role") === intended.role && d.get("email") === email) continue;
    changes.push({ uid: d.id, email, from: d.get("role") ?? null, to: intended.role });
    if (!dryRun) {
      await d.ref.set({ role: intended.role, email, roleMigratedAt: FieldValue.serverTimestamp(), roleBefore: d.get("role") ?? null }, { merge: true });
    }
  }
  if (!dryRun && changes.length) void logEvent({ kind: "system", summary: `5.0 migration: ${changes.length} member role(s) restored` });
  return { dryRun, changes };
}

export async function carryOver(dryRun: boolean) {
  const db = adminDb();
  const members = (await db.collection("users").where("role", "in", [...MEMBER_ROLES]).get()).docs;
  const her = members.find((d) => d.get("role") === "sanctuary_owner")?.id;
  const him = members.find((d) => d.get("role") === "admin" && d.get("email") === "backupe9@gmail.com")?.id
    ?? members.find((d) => d.get("role") === "admin")?.id;
  if (!him) return { dryRun, error: "No admin member profile yet; run the role fix first.", created: 0, existing: 0 };

  const ownerFor = (s: DocumentSnapshot) => {
    const byId = String(s.get("authorId") ?? s.get("userId") ?? "");
    if (members.some((m) => m.id === byId)) return byId;
    if (/razia/i.test(String(s.get("author") ?? s.get("authorName") ?? "")) && her) return her;
    return him;
  };

  const now = new Date().toISOString();
  const result = { dryRun, created: 0, existing: 0, bySource: {} as Record<string, number> };
  const coll = { memory_book: "memory_book", timeline: "timeline_moments", us_drops: "us_drops" } as const;
  for (const source of ["memory_book", "timeline", "us_drops"] as const) {
    const snap = await db.collection(coll[source]).get();
    for (const s of snap.docs) {
      const ref = db.collection("memories").doc(importDocId(source, s.id));
      if ((await ref.get()).exists) { result.existing++; continue; }
      result.created++;
      result.bySource[source] = (result.bySource[source] ?? 0) + 1;
      if (dryRun) continue;
      const { provenanceLabel, ...fields } = internalMemoryFields(source, s, now);
      await ref.create({
        ownerId: ownerFor(s), visibility: "shared", ...fields, thumbnail: null, location: null, collectionIds: [],
        favouritedBy: [], status: "organised", source, sourceRecordId: s.id, lastOpenedAt: null,
        provenance: { label: provenanceLabel, importedBy: "5.0 migration", importedAt: now },
        createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
      });
    }
  }
  if (!dryRun && result.created) void logEvent({ kind: "import", summary: `5.0 migration: ${result.created} memories carried into the garden` });
  return result;
}
