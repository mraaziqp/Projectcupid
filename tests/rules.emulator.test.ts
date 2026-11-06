/**
 * Firestore security rules, tested in the Firestore emulator against the
 * NAMED database the app uses (ai-studio-60c2955c-…), with the real rules
 * file loaded by the emulator from firebase.json.
 *
 * Run: npm run test:rules   (wraps `firebase emulators:exec`)
 */
import { initializeApp, deleteApp, type FirebaseApp } from "firebase/app";
import {
  getFirestore, connectFirestoreEmulator, doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc,
  collection, getDocs, query, where, arrayUnion, terminate, type Firestore,
} from "firebase/firestore";
import { initializeApp as adminInit } from "firebase-admin/app";
import { getFirestore as adminFirestore } from "firebase-admin/firestore";
import { section, test, allowed, denied, eq, assert, summary } from "./harness";

const PROJECT = "studio-9165894196-8cf76";
const NAMED_DB = "ai-studio-60c2955c-bef0-41d4-8dcc-ddbec95be891";
const HOST = (process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8085").split(":");
if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error("Run inside `firebase emulators:exec` (FIRESTORE_EMULATOR_HOST is not set).");

const RAAZIQ = { uid: "raaziq_uid", email: "backupe9@gmail.com" };
const RAAZIQ2 = { uid: "raaziq_uid_2", email: "mraaziqp@gmail.com" };
const RAZIA = { uid: "razia_uid", email: "raziashade4@gmail.com" };
const STRANGER = { uid: "stranger_uid", email: "someone@gmail.com" };
const apps: FirebaseApp[] = [];
const dbs: Firestore[] = [];

function client(who: { uid: string; email?: string; verified?: boolean } | null, database = NAMED_DB): Firestore {
  const app = initializeApp({ projectId: PROJECT, apiKey: "fake-api-key" }, `c${apps.length}`);
  apps.push(app);
  const db = getFirestore(app, database);
  connectFirestoreEmulator(db, HOST[0], Number(HOST[1]), who ? {
    mockUserToken: { sub: who.uid, user_id: who.uid, email: who.email, email_verified: who.verified ?? true, firebase: { sign_in_provider: "google.com", identities: {} } } as any,
  } : undefined);
  dbs.push(db);
  return db;
}

const admin = adminFirestore(adminInit({ projectId: PROJECT }, "seed"), NAMED_DB);

async function clearDb() {
  for (const database of [NAMED_DB, "(default)"]) {
    await fetch(`http://${HOST.join(":")}/emulator/v1/projects/${PROJECT}/databases/${encodeURIComponent(database)}/documents`, { method: "DELETE" });
  }
}

const memoryDoc = (over: Record<string, any> = {}) => ({
  ownerId: RAAZIQ.uid, visibility: "shared", title: "Beach day", caption: "We laughed", memoryDate: "2025-11-05",
  datePrecision: "day", mediaType: "text", media: [], thumbnail: null, tags: ["beach"], location: null, collectionIds: [],
  favouritedBy: [], isSpecialOccasion: false, status: "inbox", source: "cupid", sourceRecordId: null,
  provenance: { label: "Saved in Project Cupid" }, lastOpenedAt: null, ...over,
});

async function seed() {
  await clearDb();
  await admin.doc(`users/${RAAZIQ.uid}`).set({ uid: RAAZIQ.uid, email: RAAZIQ.email, role: "admin", displayName: "Raaziq" });
  await admin.doc(`users/${RAZIA.uid}`).set({ uid: RAZIA.uid, email: RAZIA.email, role: "sanctuary_owner", displayName: "Razia" });
  await admin.doc(`users/legacy_reader`).set({ uid: "legacy_reader", email: "old@x.com", role: "reader", displayName: "Old guest" });
  await admin.doc("letters/l1").set({ title: "Hi", content: "Love", isPublished: true });
  for (const c of ["cycle_logs", "wellbeing_symptoms", "wellbeing_moods", "wellbeing_medications", "wellbeing_appointments", "wellbeing_journal"]) {
    await admin.doc(`${c}/razia_1`).set({ userId: RAZIA.uid, note: "private" });
  }
  await admin.doc(`wellbeing_settings/${RAZIA.uid}`).set({ sharePartnerUpdates: false });
  await admin.doc("memories/shared1").set(memoryDoc());
  await admin.doc("memories/private_raaziq").set(memoryDoc({ visibility: "private", title: "Just mine" }));
  await admin.doc("memories/private_razia").set(memoryDoc({ ownerId: RAZIA.uid, visibility: "private", title: "Hers" }));
  await admin.doc("jarvis_audit_logs/a1").set({ action: "x", status: "success", timestamp: new Date() });
  await admin.doc("notificationLogs/n1").set({ kind: "letter", at: new Date() });
  await admin.doc(`integration_secrets/${RAAZIQ.uid}`).set({ savestate: { token: "sealed" } });
  await admin.doc("identity_links/ss_1").set({ uid: RAAZIQ.uid });
  await admin.doc("notifications/to_razia").set({ userId: RAZIA.uid, senderId: RAAZIQ.uid, title: "t", body: "b", read: false });
  await admin.doc(`memory_perspectives/shared1_${RAZIA.uid}`).set({ memoryId: "shared1", authorId: RAZIA.uid, text: "draft", shared: false });
}

async function main() {
  await seed();
  const raaziq = client(RAAZIQ);
  const razia = client(RAZIA);
  const stranger = client(STRANGER);
  const anon = client(null);
  const unverifiedRaaziq2 = client({ ...RAAZIQ2, verified: false });
  const raaziq2 = client(RAAZIQ2);

  section("Authentication and membership");
  await test("unauthenticated users cannot read letters", () => denied(getDoc(doc(anon, "letters/l1"))));
  await test("unauthenticated users cannot read memories", () => denied(getDocs(query(collection(anon, "memories"), where("visibility", "==", "shared")))));
  await test("members can read shared letters", () => allowed(getDoc(doc(razia, "letters/l1"))));
  await test("a signed-in stranger cannot read letters", () => denied(getDoc(doc(stranger, "letters/l1"))));
  await test("a stranger cannot make themselves a member (sanctuary_owner)", () =>
    denied(setDoc(doc(stranger, `users/${STRANGER.uid}`), { uid: STRANGER.uid, email: STRANGER.email, role: "sanctuary_owner", displayName: "x" })));
  await test("a stranger cannot make themselves a member (reader)", () =>
    denied(setDoc(doc(stranger, `users/${STRANGER.uid}`), { uid: STRANGER.uid, email: STRANGER.email, role: "reader", displayName: "x" })));
  await test("an allowlisted email with an unverified address cannot bootstrap", () =>
    denied(setDoc(doc(unverifiedRaaziq2, `users/${RAAZIQ2.uid}`), { uid: RAAZIQ2.uid, email: RAAZIQ2.email, role: "admin", displayName: "R" })));
  await test("an allowlisted, verified account can bootstrap its own profile", () =>
    allowed(setDoc(doc(raaziq2, `users/${RAAZIQ2.uid}`), { uid: RAAZIQ2.uid, email: RAAZIQ2.email, role: "admin", displayName: "R" })));
  await test("nobody can create a profile for another uid", () =>
    denied(setDoc(doc(raaziq, `users/someone_else`), { uid: "someone_else", email: RAAZIQ.email, role: "admin", displayName: "R" })));
  await test("old 'reader' profiles no longer grant access", async () => {
    const legacy = client({ uid: "legacy_reader", email: "old@x.com" });
    await denied(getDoc(doc(legacy, "letters/l1")));
  });
  await test("a stranger cannot list member profiles", () => denied(getDocs(collection(stranger, "users"))));

  section("Role security");
  await test("Razia cannot promote herself to admin", () => denied(updateDoc(doc(razia, `users/${RAZIA.uid}`), { role: "admin" })));
  await test("a member cannot change their own email field", () => denied(updateDoc(doc(razia, `users/${RAZIA.uid}`), { email: "x@y.z" })));
  await test("a member cannot forge their SaveState profile", () => denied(updateDoc(doc(razia, `users/${RAZIA.uid}`), { savestate: { username: "fake" } })));
  await test("a member can update their own display name and preferences", () => allowed(updateDoc(doc(razia, `users/${RAZIA.uid}`), { displayName: "Razia ❤", emailNotifications: false })));
  await test("admin cannot rewrite Razia's profile from the client", () => denied(updateDoc(doc(raaziq, `users/${RAZIA.uid}`), { role: "partner" })));
  await test("profiles cannot be deleted from the client", () => denied(deleteDoc(doc(raaziq, `users/${RAZIA.uid}`))));

  section("Wellbeing privacy (admin does not bypass)");
  for (const c of ["cycle_logs", "wellbeing_symptoms", "wellbeing_moods", "wellbeing_medications", "wellbeing_appointments", "wellbeing_journal"]) {
    await test(`Raaziq (admin) cannot read Razia's ${c}`, () => denied(getDoc(doc(raaziq, `${c}/razia_1`))));
    await test(`Raaziq cannot list Razia's ${c}`, () => denied(getDocs(query(collection(raaziq, c), where("userId", "==", RAZIA.uid)))));
  }
  await test("Razia can read her own cycle log", () => allowed(getDoc(doc(razia, "cycle_logs/razia_1"))));
  await test("Raaziq cannot read Razia's wellbeing settings", () => denied(getDoc(doc(raaziq, `wellbeing_settings/${RAZIA.uid}`))));
  await test("Razia can turn partner sharing on in her settings", () => allowed(updateDoc(doc(razia, `wellbeing_settings/${RAZIA.uid}`), { sharePartnerUpdates: true })));
  await test("Raaziq cannot create a cycle log claiming to be Razia", () => denied(setDoc(doc(raaziq, "cycle_logs/forged"), { userId: RAZIA.uid })));
  await test("ownership of a wellbeing record cannot be transferred", () => denied(updateDoc(doc(razia, "wellbeing_journal/razia_1"), { userId: RAAZIQ.uid })));
  await test("Raaziq cannot delete Razia's journal", () => denied(deleteDoc(doc(raaziq, "wellbeing_journal/razia_1"))));

  section("Append-only and server-only records");
  await test("Raaziq (admin) can read Jarvis audit logs", () => allowed(getDoc(doc(raaziq, "jarvis_audit_logs/a1"))));
  await test("Razia cannot read Jarvis audit logs", () => denied(getDoc(doc(razia, "jarvis_audit_logs/a1"))));
  await test("audit logs cannot be modified", () => denied(updateDoc(doc(raaziq, "jarvis_audit_logs/a1"), { status: "rejected" })));
  await test("audit logs cannot be deleted", () => denied(deleteDoc(doc(raaziq, "jarvis_audit_logs/a1"))));
  await test("audit logs cannot be forged from the client", () => denied(addDoc(collection(raaziq, "jarvis_audit_logs"), { action: "fake", timestamp: new Date() })));
  await test("notification logs cannot be altered", () => denied(updateDoc(doc(raaziq, "notificationLogs/n1"), { kind: "x" })));
  await test("encrypted SaveState sessions are unreadable even to their owner", () => denied(getDoc(doc(raaziq, `integration_secrets/${RAAZIQ.uid}`))));
  await test("account links cannot be written from the client", () => denied(setDoc(doc(razia, "identity_links/ss_999"), { uid: RAZIA.uid })));
  await test("account links cannot be read from the client", () => denied(getDoc(doc(raaziq, "identity_links/ss_1"))));
  await test("ecosystem logs cannot be written from the client", () => denied(addDoc(collection(raaziq, "ecosystem_log"), { kind: "x" })));

  section("Notifications");
  await test("the recipient can read and mark a notification read", async () => {
    await allowed(getDoc(doc(razia, "notifications/to_razia")));
    await allowed(updateDoc(doc(razia, "notifications/to_razia"), { read: true }));
  });
  await test("the recipient cannot rewrite a notification's text", () => denied(updateDoc(doc(razia, "notifications/to_razia"), { body: "changed" })));
  await test("a stranger cannot read notifications", () => denied(getDoc(doc(stranger, "notifications/to_razia"))));
  await test("a member cannot send a notification as someone else", () => denied(addDoc(collection(razia, "notifications"), { userId: RAAZIQ.uid, senderId: RAAZIQ.uid, title: "x", body: "y", read: false })));

  section("Memory Garden — visibility");
  await test("Razia can read a shared memory", () => allowed(getDoc(doc(razia, "memories/shared1"))));
  await test("Razia cannot read Raaziq's private memory", () => denied(getDoc(doc(razia, "memories/private_raaziq"))));
  await test("Raaziq (admin) cannot read Razia's private memory", () => denied(getDoc(doc(raaziq, "memories/private_razia"))));
  await test("listing shared memories works", async () => { const s = await getDocs(query(collection(razia, "memories"), where("visibility", "==", "shared"))); eq(s.size, 1); });
  await test("listing my own memories returns only mine", async () => { const s = await getDocs(query(collection(razia, "memories"), where("ownerId", "==", RAZIA.uid))); eq(s.docs.map((d) => d.id), ["private_razia"]); });
  await test("an unfiltered list of all memories is refused", () => denied(getDocs(collection(razia, "memories"))));
  await test("a stranger cannot read shared memories", () => denied(getDoc(doc(stranger, "memories/shared1"))));

  section("Memory Garden — writing");
  await test("a member can create a shared text memory", () => allowed(setDoc(doc(razia, "memories/new_shared"), memoryDoc({ ownerId: RAZIA.uid }))));
  await test("a member can create a private text memory", () => allowed(setDoc(doc(razia, "memories/new_private"), memoryDoc({ ownerId: RAZIA.uid, visibility: "private" }))));
  await test("creating a memory owned by someone else is refused", () => denied(setDoc(doc(razia, "memories/forged"), memoryDoc({ ownerId: RAAZIQ.uid }))));
  await test("creating a memory with media from the client is refused (server only)", () =>
    denied(setDoc(doc(razia, "memories/with_media"), memoryDoc({ ownerId: RAZIA.uid, mediaType: "photo", media: [{ store: "savestate", kind: "photo", mime: "image/jpeg", ref: { albumId: "x", photoId: "y", filename: "z" } }] }))));
  await test("a client cannot create an 'imported' memory", () => denied(setDoc(doc(razia, "memories/fake_import"), memoryDoc({ ownerId: RAZIA.uid, source: "savestate", sourceRecordId: "a/b" }))));
  await test("an invalid visibility is refused", () => denied(setDoc(doc(razia, "memories/bad_vis"), memoryDoc({ ownerId: RAZIA.uid, visibility: "public" }))));
  await test("unexpected fields are refused", () => denied(setDoc(doc(razia, "memories/extra"), { ...memoryDoc({ ownerId: RAZIA.uid }), cycleDay: 3 })));
  await test("a bad date is refused", () => denied(setDoc(doc(razia, "memories/bad_date"), memoryDoc({ ownerId: RAZIA.uid, memoryDate: "5 Nov" }))));
  await test("the owner can edit title, caption and date", () => allowed(updateDoc(doc(raaziq, "memories/shared1"), { title: "Beach day!", memoryDate: "2025-11-04" })));
  await test("the owner can make a memory private", () => allowed(updateDoc(doc(raaziq, "memories/shared1"), { visibility: "private" })));
  await test("…and shared again", () => allowed(updateDoc(doc(raaziq, "memories/shared1"), { visibility: "shared" })));
  await test("the owner cannot change where a memory came from", () => denied(updateDoc(doc(raaziq, "memories/shared1"), { source: "weddingapp" })));
  await test("the owner cannot transfer ownership", () => denied(updateDoc(doc(raaziq, "memories/shared1"), { ownerId: RAZIA.uid })));
  await test("the owner cannot swap media references from the client", () => denied(updateDoc(doc(raaziq, "memories/shared1"), { media: [{ store: "savestate", kind: "photo", mime: "image/jpeg", ref: { albumId: "other" } }] })));
  await test("the partner can favourite a shared memory for herself", () => allowed(updateDoc(doc(razia, "memories/shared1"), { favouritedBy: arrayUnion(RAZIA.uid) })));
  await test("the partner cannot favourite on the owner's behalf", () => denied(updateDoc(doc(razia, "memories/shared1"), { favouritedBy: arrayUnion(RAAZIQ.uid) })));
  await test("the partner cannot edit the caption of the owner's memory", () => denied(updateDoc(doc(razia, "memories/shared1"), { caption: "changed" })));
  await test("the partner cannot make the owner's memory private or public", () => denied(updateDoc(doc(razia, "memories/shared1"), { visibility: "private" })));
  await test("the partner cannot touch a private memory at all", () => denied(updateDoc(doc(razia, "memories/private_raaziq"), { lastOpenedAt: 1 })));
  await test("memories cannot be deleted from the client (server tidies media)", () => denied(deleteDoc(doc(raaziq, "memories/shared1"))));

  section("Two Perspectives");
  await test("Razia's unshared perspective is hidden from Raaziq", () => denied(getDoc(doc(raaziq, `memory_perspectives/shared1_${RAZIA.uid}`))));
  await test("Razia can read her own draft perspective", () => allowed(getDoc(doc(razia, `memory_perspectives/shared1_${RAZIA.uid}`))));
  await test("Razia shares it", () => allowed(setDoc(doc(razia, `memory_perspectives/shared1_${RAZIA.uid}`), { memoryId: "shared1", authorId: RAZIA.uid, text: "My side", shared: true })));
  await test("now Raaziq can read it", () => allowed(getDoc(doc(raaziq, `memory_perspectives/shared1_${RAZIA.uid}`))));
  await test("Raaziq cannot write a perspective as Razia", () => denied(setDoc(doc(raaziq, `memory_perspectives/shared1_${RAZIA.uid}`), { memoryId: "shared1", authorId: RAZIA.uid, text: "forged", shared: true })));
  await test("Raaziq cannot attach a perspective to Razia's private memory", () => denied(setDoc(doc(raaziq, `memory_perspectives/private_razia_${RAAZIQ.uid}`), { memoryId: "private_razia", authorId: RAAZIQ.uid, text: "x", shared: true })));

  section("Reactions and collections");
  await test("a member can react to a shared memory", () => allowed(setDoc(doc(razia, `memory_reactions/shared1_${RAZIA.uid}`), { memoryId: "shared1", userId: RAZIA.uid, emoji: "❤️", note: "love this" })));
  await test("reactions on private memories are refused", () => denied(setDoc(doc(razia, `memory_reactions/private_raaziq_${RAZIA.uid}`), { memoryId: "private_raaziq", userId: RAZIA.uid, emoji: "❤️", note: null })));
  await test("a member cannot react as someone else", () => denied(setDoc(doc(razia, `memory_reactions/shared1_${RAAZIQ.uid}`), { memoryId: "shared1", userId: RAAZIQ.uid, emoji: "❤️", note: null })));
  let colId = "";
  await test("a member can create a shared collection", async () => { colId = (await addDoc(collection(raaziq, "memory_collections"), { ownerId: RAAZIQ.uid, name: "Our Firsts", description: "", visibility: "shared" })).id; });
  await test("the partner can rename a shared collection", () => allowed(updateDoc(doc(razia, `memory_collections/${colId}`), { name: "Our Firsts ❤" })));
  await test("the partner cannot delete it", () => denied(deleteDoc(doc(razia, `memory_collections/${colId}`))));
  await test("the partner can file a shared memory into it", () => allowed(updateDoc(doc(razia, "memories/shared1"), { collectionIds: arrayUnion(colId) })));
  let privCol = "";
  await test("a private collection is invisible to the partner", async () => {
    privCol = (await addDoc(collection(raaziq, "memory_collections"), { ownerId: RAAZIQ.uid, name: "Mine", visibility: "private" })).id;
    await denied(getDoc(doc(razia, `memory_collections/${privCol}`)));
  });

  section("Daily memory");
  await test("a member can store their own daily pick", () => allowed(setDoc(doc(razia, `daily_memory/${RAZIA.uid}_2026-11-05`), { userId: RAZIA.uid, date: "2026-11-05", memoryId: "shared1", skip: 0 })));
  await test("a member cannot write someone else's daily pick", () => denied(setDoc(doc(razia, `daily_memory/${RAAZIQ.uid}_2026-11-05`), { userId: RAAZIQ.uid, date: "2026-11-05", memoryId: "shared1", skip: 0 })));
  await test("daily picks are private to each person", () => denied(getDoc(doc(raaziq, `daily_memory/${RAZIA.uid}_2026-11-05`))));

  section("The (default) database gets the same rules");
  await test("a stranger cannot self-register in (default) either", () => {
    const d = client(STRANGER, "(default)");
    return denied(setDoc(doc(d, `users/${STRANGER.uid}`), { uid: STRANGER.uid, email: STRANGER.email, role: "sanctuary_owner", displayName: "x" }));
  });
  await test("tests really ran against the named database", async () => {
    const snap = await admin.doc("memories/new_shared").get();
    assert(snap.exists, "the memory created through the client is in the named database");
  });

  for (const d of dbs) await terminate(d).catch(() => {});
  for (const a of apps) await deleteApp(a).catch(() => {});
  process.exit(summary("FIRESTORE RULES (EMULATOR, NAMED DATABASE)"));
}

main().catch((e) => { console.error(e); process.exit(1); });
