/**
 * The Cupid API end to end: the real router, the Firestore and Auth emulators
 * (with the real rules), and local fakes of SaveState, Resend, Gemini, Jarvis
 * and WeddingApp. Two real member accounts (Raaziq and Razia) plus a stranger.
 *
 * Run: npm run test:server
 */
import http from "node:http";
import type { AddressInfo } from "node:net";
import { section, test, assert, eq, summary } from "./harness";
import { serve, fakeSaveState, fakeResend, fakeGemini, fakeJarvis, fakeWedding, JPEG, MP4 } from "./fakes";

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  throw new Error("Run inside `firebase emulators:exec --only firestore,auth`.");
}

const SS = fakeSaveState();
const RESEND = fakeResend();
const JARVIS = fakeJarvis();
const WEDDING = fakeWedding();

const RAAZIQ = { uid: "raaziq_uid", email: "backupe9@gmail.com" };
const RAZIA = { uid: "razia_uid", email: "raziashade4@gmail.com" };
const STRANGER = { uid: "stranger_uid", email: "someone@gmail.com" };
const SECRETS = {
  CUPID_SESSION_SECRET: "test-session-secret-0123456789abcdef0123456789",
  CUPID_SAVESTATE_ALBUM_PIN: "album-pin-0123456789abcdef",
  JARVIS_API_KEY: "jarvis-inbound-key-0123456789abcdef0123456789",
  BRIDGE_SECRET: "bridge-secret-0123456789abcdef0123456789abcd",
  CRON_SECRET: "cron-secret-0123456789abcdef0123456789abcdef",
  RESEND_API_KEY: "re_test_key",
  GEMINI_API_KEY: "good",
  JARVIS_ECOSYSTEM_KEY: "jb_live_sk_test",
};

let base = "";
const tokens: Record<string, string> = {};

async function api(path: string, opts: { as?: string; method?: string; body?: unknown; headers?: Record<string, string> } = {}) {
  const headers: Record<string, string> = { ...(opts.headers ?? {}) };
  if (opts.as) headers.Authorization = `Bearer ${tokens[opts.as]}`;
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  const r = await fetch(`${base}/api/${path}`, { method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"), headers, body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined });
  const type = r.headers.get("content-type") ?? "";
  const data = type.includes("json") ? await r.json() : Buffer.from(await r.arrayBuffer());
  return { status: r.status, data: data as any, type };
}

async function idTokenFor(uid: string): Promise<string> {
  const { adminAuth } = await import("../lib/server/firebaseAdmin");
  const custom = await adminAuth().createCustomToken(uid);
  return exchange(custom);
}
async function exchange(customToken: string): Promise<string> {
  const r = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  });
  const b: any = await r.json();
  if (!b.idToken) throw new Error(`token exchange failed: ${JSON.stringify(b)}`);
  return b.idToken;
}
const uidOf = (idToken: string) => JSON.parse(Buffer.from(idToken.split(".")[1], "base64url").toString()).user_id;

async function main() {
  const fakes = await Promise.all([serve(SS.handler), serve(RESEND.handler), serve(fakeGemini().handler), serve(JARVIS.handler), serve(WEDDING.handler)]);
  Object.assign(process.env, SECRETS, {
    SAVESTATE_URL: fakes[0].url, RESEND_API_BASE: fakes[1].url, GEMINI_API_BASE: fakes[2].url, JARVIS_URL: fakes[3].url,
    WEDDINGAPP_URL: fakes[4].url, GEMINI_TIMEOUT_MS: "1000",
    CUPID_SAVESTATE_LINKS: JSON.stringify({ "ss-razia": RAZIA.email }),
  });

  const { handle } = await import("../lib/server/router");
  const { adminDb, adminAuth } = await import("../lib/server/firebaseAdmin");
  const server = http.createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    const raw = Buffer.concat(chunks).toString();
    (req as any).body = raw ? JSON.parse(raw) : undefined;
    await handle(req as any, res as any);
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  // Two members (as Google accounts in the Auth emulator) and their profiles; one stranger.
  const db = adminDb();
  for (const u of [RAAZIQ, RAZIA, STRANGER]) await adminAuth().createUser({ uid: u.uid, email: u.email, emailVerified: true }).catch(() => {});
  await db.doc(`users/${RAAZIQ.uid}`).set({ uid: RAAZIQ.uid, email: RAAZIQ.email, role: "admin", displayName: "Raaziq" });
  await db.doc(`users/${RAZIA.uid}`).set({ uid: RAZIA.uid, email: RAZIA.email, role: "sanctuary_owner", displayName: "Razia", fcmToken: "fake-fcm-token" });
  tokens.raaziq = await idTokenFor(RAAZIQ.uid);
  tokens.razia = await idTokenFor(RAZIA.uid);
  tokens.stranger = await idTokenFor(STRANGER.uid);

  section("Who may call");
  await test("member routes refuse requests with no token", async () => eq((await api("ecosystem/status")).status, 401));
  await test("member routes refuse a signed-in non-member", async () => eq((await api("ecosystem/status", { as: "stranger" })).status, 403));
  await test("a forged bearer token is refused", async () => eq((await api("notify", { body: { kind: "general", title: "x", body: "y" }, headers: { Authorization: "Bearer not-a-token" } })).status, 401));
  await test("admin diagnostics refuse the partner", async () => eq((await api("admin/diagnostics", { as: "razia" })).status, 403));
  await test("unknown routes answer 404", async () => eq((await api("notify-letter", { body: {} })).status, 404));

  section("Signing in with SaveState");
  await test("an unlinked SaveState account is refused", async () => {
    const r = await api("auth/savestate/login", { body: { identifier: "mraaziqp", password: "right-pass" } });
    eq(r.status, 403); eq(r.data.code, "not_linked");
  });
  await test("a SaveState account using a member's email cannot sign in as her", async () => {
    const r = await api("auth/savestate/login", { body: { identifier: "impostor", password: "x-pass-123" } });
    eq(r.status, 403); eq(r.data.code, "not_linked");
  });
  await test("a wrong password is refused", async () => eq((await api("auth/savestate/login", { body: { identifier: "mraaziqp", password: "nope" } })).status, 401));
  await test("Raaziq links his SaveState account from inside Cupid", async () => {
    const r = await api("auth/savestate/link", { as: "raaziq", body: { identifier: "mraaziqp", password: "right-pass" } });
    eq(r.status, 200); eq(r.data.savestate.username, "mraaziqp");
  });
  await test("…and can now sign in with SaveState as his own Cupid account", async () => {
    const r = await api("auth/savestate/login", { body: { identifier: "mraaziqp", password: "right-pass" } });
    eq(r.status, 200);
    eq(uidOf(await exchange(r.data.customToken)), RAAZIQ.uid);
  });
  await test("his SaveState profile is mirrored onto his Cupid profile", async () => {
    eq((await db.doc(`users/${RAAZIQ.uid}`).get()).get("savestate.username"), "mraaziqp");
  });
  await test("the SaveState session is stored encrypted, not in plain text", async () => {
    const s = (await db.doc(`integration_secrets/${RAAZIQ.uid}`).get()).get("savestate.token");
    assert(typeof s === "string" && s.startsWith("v1.") && !s.includes("tok-ss-raaziq"), "token is sealed");
  });
  await test("Razia signs in through the pre-approved link (CUPID_SAVESTATE_LINKS)", async () => {
    const r = await api("auth/savestate/login", { body: { identifier: "razia", password: "her-pass" } });
    eq(r.status, 200);
    eq(uidOf(await exchange(r.data.customToken)), RAZIA.uid);
  });
  await test("one SaveState account cannot be linked to the other partner", async () => {
    const r = await api("auth/savestate/link", { as: "razia", body: { identifier: "mraaziqp", password: "right-pass" } });
    eq(r.status, 409);
  });
  await test("a stranger cannot link anything", async () => eq((await api("auth/savestate/link", { as: "stranger", body: { identifier: "mraaziqp", password: "right-pass" } })).status, 403));
  await test("repeated wrong passwords are rate limited", async () => {
    let last = 0;
    for (let i = 0; i < 10; i++) last = (await api("auth/savestate/login", { body: { identifier: "razia", password: `bad-${i}` } })).status;
    eq(last, 429);
    await db.collection("rate_limits").get().then((s) => Promise.all(s.docs.map((d) => d.ref.delete())));
  });

  section("Profile pictures from SaveState");
  await test("Raaziq sees all his SaveState profile pictures", async () => eq((await api("savestate/profile-images", { as: "raaziq" })).data.images.length, 2));
  await test("Razia sees only the public one", async () => {
    const r = await api(`savestate/profile-images?uid=${RAAZIQ.uid}`, { as: "razia" });
    eq(r.data.images.map((i: any) => i.id), ["img-pub"]);
  });
  await test("Razia cannot fetch his private picture by id", async () => eq((await api(`savestate/profile-image?uid=${RAAZIQ.uid}&id=img-priv`, { as: "razia" })).status, 404));
  await test("the public picture's bytes come through", async () => {
    const r = await api(`savestate/profile-image?uid=${RAAZIQ.uid}&id=img-pub`, { as: "razia" });
    eq(r.status, 200); assert(Buffer.isBuffer(r.data) && r.data[0] === 0xff, "jpeg bytes");
  });

  section("Notifications and mail");
  await test("a letter notifies the partner and emails her, escaped, with replies to the sender", async () => {
    SS.state.mails.length = 0;
    const r = await api("notify", { as: "raaziq", body: { kind: "letter", title: "For you <script>alert(1)</script>", body: "Open me", emailBody: "Dear Razia\n\nYou are <b>loved</b>" } });
    eq(r.status, 200); eq(r.data.email.sent, 1); eq(r.data.email.via, ["resend"]);
    const sent = RESEND.state.sent[RESEND.state.sent.length - 1];
    eq(sent.to, [RAZIA.email]);
    eq(sent.reply_to, RAAZIQ.email);
    assert(!sent.html.includes("<script>"), "html is escaped");
    assert(sent.html.includes("&lt;b&gt;loved&lt;/b&gt;"), "body escaped");
    const n = await db.collection("notifications").where("userId", "==", RAZIA.uid).get();
    eq(n.size, 1);
  });
  await test("the client cannot choose the recipient", async () => {
    const r = await api("notify", { as: "raaziq", body: { kind: "general", title: "x", body: "y", recipientEmail: "attacker@example.com" } });
    eq(r.status, 400);
  });
  await test("when Resend fails, SaveState's relay sends it instead", async () => {
    RESEND.state.works = false; SS.state.mails.length = 0;
    const r = await api("notify", { as: "raaziq", body: { kind: "nudge", title: "Thinking of you", body: "x" } });
    RESEND.state.works = true;
    eq(r.data.email.via, ["savestate"]); eq(SS.state.mails.length, 1); eq(SS.state.mails[0].to_email, RAZIA.email);
  });
  await test("when every channel fails the answer says so", async () => {
    SS.state.mailWorks = false; RESEND.state.works = false;
    const r = await api("notify", { as: "raaziq", body: { kind: "nudge", title: "x", body: "y" } });
    SS.state.mailWorks = true; RESEND.state.works = true;
    eq(r.data.email.sent, 0); eq(r.data.email.failed, 1);
  });
  await test("wellbeing updates are refused unless she turned sharing on", async () => {
    eq((await api("notify", { as: "razia", body: { kind: "wellbeing", title: "x", body: "y" } })).status, 403);
  });
  await test("with sharing on, a wellbeing update goes in-app only — never by email", async () => {
    await db.doc(`wellbeing_settings/${RAZIA.uid}`).set({ sharePartnerUpdates: true });
    SS.state.mails.length = 0; RESEND.state.sent.length = 0;
    const r = await api("notify", { as: "razia", body: { kind: "wellbeing", title: "Gentle day", body: "Be soft with me today" } });
    eq(r.status, 200); eq(r.data.email.sent, 0); eq(SS.state.mails.length + RESEND.state.sent.length, 0);
  });
  await test("Razia's notifications reach Raaziq, not herself", async () => {
    const n = await db.collection("notifications").where("senderId", "==", RAZIA.uid).get();
    assert(n.docs.every((d) => d.get("userId") === RAAZIQ.uid), "recipient is the partner");
  });

  section("Memory Garden — saving moments");
  let sharedPhotoId = "", privatePhotoId = "", textId = "";
  const photo = `data:image/jpeg;base64,${JPEG.toString("base64")}`;
  const thumb = `data:image/jpeg;base64,${JPEG.toString("base64")}`;
  await test("visibility must be chosen explicitly", async () => eq((await api("memories", { as: "raaziq", body: { title: "x" } })).status, 400));
  await test("a shared photo memory is saved; the photo goes to Cupid's PIN-locked SaveState album", async () => {
    const r = await api("memories", { as: "raaziq", body: { title: "Sunset", visibility: "shared", memoryDate: "2025-11-05", file: { kind: "photo", data: photo }, thumbnail: thumb, tags: ["First", "beach"] } });
    eq(r.status, 200); sharedPhotoId = r.data.id;
    const album = SS.state.albums.find((a) => a.name.startsWith("Project Cupid"));
    assert(album && album.pin === SECRETS.CUPID_SAVESTATE_ALBUM_PIN, "album created and PIN-locked");
    eq(r.data.media[0].ref.albumId, album!.id);
    eq(r.data.tags, ["first", "beach"]);
  });
  await test("the album's newest file is a blank cover, so SaveState never previews a real photo", async () => {
    const album = SS.state.albums.find((a) => a.name.startsWith("Project Cupid"))!;
    const files = SS.state.photos.filter((p) => p.albumId === album.id);
    eq(files[files.length - 1].originalName, "cover.png");
    eq(files.filter((f) => f.originalName === "cover.png").length, 1);
  });
  await test("a private photo memory is saved", async () => {
    const r = await api("memories", { as: "raaziq", body: { title: "Mine", visibility: "private", file: { kind: "photo", data: photo } } });
    eq(r.status, 200); privatePhotoId = r.data.id;
  });
  await test("a words-only memory needs no SaveState", async () => {
    const r = await api("memories", { as: "razia", body: { title: "Our first walk", caption: "The rain", visibility: "shared", memoryDate: "2024-11-05" } });
    eq(r.status, 200); textId = r.data.id; eq(r.data.media.length, 0);
  });
  await test("a file that isn't really an image is refused", async () => {
    const r = await api("memories", { as: "raaziq", body: { visibility: "shared", file: { kind: "photo", data: Buffer.from("MZ this is an exe").toString("base64") } } });
    eq(r.status, 422);
  });
  await test("a video sent as a photo is refused", async () => eq((await api("memories", { as: "raaziq", body: { visibility: "shared", file: { kind: "photo", data: MP4.toString("base64") } } })).status, 422));
  await test("an oversized file is refused", async () => {
    const big = Buffer.concat([JPEG, Buffer.alloc(3 * 1024 * 1024)]);
    eq((await api("memories", { as: "raaziq", body: { visibility: "shared", file: { kind: "photo", data: big.toString("base64") } } })).status, 422);
  });
  await test("a video upload is accepted as video", async () => {
    const r = await api("memories", { as: "raaziq", body: { title: "Dance", visibility: "shared", file: { kind: "video", data: MP4.toString("base64") } } });
    eq(r.status, 200); eq(r.data.mediaType, "video"); eq(r.data.media[0].mime, "video/mp4");
  });
  await test("a malformed thumbnail is refused", async () => eq((await api("memories", { as: "raaziq", body: { visibility: "shared", thumbnail: "javascript:alert(1)" } })).status, 400));

  section("Memory Garden — who sees what");
  await test("Razia can view the shared photo", async () => {
    const r = await api(`memories/media?id=${sharedPhotoId}&i=0&size=thumb`, { as: "razia" });
    eq(r.status, 200); assert(Buffer.isBuffer(r.data) && r.data[0] === 0xff, "jpeg bytes");
  });
  await test("Razia cannot view Raaziq's private photo (looks like it doesn't exist)", async () => eq((await api(`memories/media?id=${privatePhotoId}&i=0`, { as: "razia" })).status, 404));
  await test("a stranger cannot view anything", async () => eq((await api(`memories/media?id=${sharedPhotoId}&i=0`, { as: "stranger" })).status, 403));
  await test("when SaveState is offline the answer is a clear 503", async () => {
    SS.state.down = true;
    const r = await api(`memories/media?id=${sharedPhotoId}&i=0`, { as: "razia" });
    SS.state.down = false;
    eq(r.status, 503); eq(r.data.code, "savestate_unreachable");
  });
  await test("Razia cannot delete Raaziq's memory", async () => eq((await api("memories/delete", { as: "razia", body: { id: sharedPhotoId } })).status, 403));
  await test("Raaziq deletes his private memory and its file leaves SaveState", async () => {
    const before = SS.state.photos.length;
    eq((await api("memories/delete", { as: "raaziq", body: { id: privatePhotoId } })).status, 200);
    eq(SS.state.photos.length, before - 1);
    eq((await db.doc(`memories/${privatePhotoId}`).get()).exists, false);
  });

  section("Memory Garden — importing from SaveState and WeddingApp");
  await test("the SaveState preview lists albums, marks the PIN album restricted and hides Cupid's own", async () => {
    const r = await api("memories/sources/savestate", { as: "raaziq" });
    const byName = Object.fromEntries(r.data.albums.map((a: any) => [a.name, a.visibility]));
    eq(byName.Family, "shareable"); eq(byName.Locked, "restricted");
    assert(!r.data.albums.some((a: any) => a.name.startsWith("Project Cupid")), "Cupid's album hidden");
  });
  await test("importing from a PIN-locked album is refused, the rest come in", async () => {
    const r = await api("memories/import", { as: "raaziq", body: { source: "savestate", visibility: "private", ids: ["alb-family/p1", "alb-locked/p3"] } });
    eq(r.data.imported, 1); eq(r.data.refused.length, 1);
  });
  await test("importing the same photo twice does nothing", async () => {
    const r = await api("memories/import", { as: "raaziq", body: { source: "savestate", visibility: "private", ids: ["alb-family/p1"] } });
    eq(r.data.imported, 0); eq(r.data.skipped, 1);
  });
  await test("the import keeps its source, id and provenance", async () => {
    const s = await db.collection("memories").where("source", "==", "savestate").get();
    eq(s.size, 1);
    eq(s.docs[0].get("sourceRecordId"), "alb-family/p1");
    eq(s.docs[0].get("provenance.label"), "SaveState · Family");
    eq(s.docs[0].get("visibility"), "private");
  });
  await test("import visibility must be chosen", async () => eq((await api("memories/import", { as: "raaziq", body: { source: "savestate", ids: ["alb-family/p2"] } })).status, 400));
  await test("the WeddingApp preview shows only public, unhidden items", async () => {
    const r = await api("memories/sources/weddingapp", { as: "razia" });
    eq(r.data.items.map((i: any) => i.sourceRecordId).sort(), ["wed_public_photo_1", "wed_public_video_2"]);
  });
  await test("WeddingApp import refuses private and hidden files even if asked by id", async () => {
    const r = await api("memories/import", { as: "razia", body: { source: "weddingapp", visibility: "shared", ids: ["wed_public_photo_1", "wed_private_photo3", "wed_hidden_photo_4"] } });
    eq(r.data.imported, 1); eq(r.data.refused.length, 2);
  });
  await test("the imported wedding photo keeps its album, provenance and a real thumbnail", async () => {
    const s = await db.collection("memories").where("source", "==", "weddingapp").get();
    eq(s.size, 1);
    eq(s.docs[0].get("provenance.label"), "WeddingApp · Nikkah");
    assert(String(s.docs[0].get("thumbnail")).startsWith("data:image/jpeg;base64,"), "thumbnail stored");
    assert(s.docs[0].get("tags").includes("nikkah"), "album tag");
  });
  await test("the imported wedding photo is served to Raaziq", async () => {
    const s = await db.collection("memories").where("source", "==", "weddingapp").get();
    eq((await api(`memories/media?id=${s.docs[0].id}&i=0`, { as: "raaziq" })).status, 200);
  });
  await test("disconnecting WeddingApp removes only Cupid's references", async () => {
    const r = await api("memories/sources/disconnect", { as: "razia", body: { source: "weddingapp", removeImported: true } });
    eq(r.data.removed, 1);
    eq(WEDDING.items.length, 4);
    eq((await api("memories/sources/weddingapp", { as: "razia" })).status, 409);
    await api("memories/sources/reconnect", { as: "razia", body: { source: "weddingapp" } });
    eq((await api("memories/sources/weddingapp", { as: "razia" })).status, 200);
  });
  await test("published letters can be imported; drafts never", async () => {
    await db.doc("letters/pub").set({ title: "Published", content: "Hi", isPublished: true });
    await db.doc("letters/draft").set({ title: "Draft", content: "secret", isPublished: false });
    const r = await api("memories/import", { as: "raaziq", body: { source: "letters", visibility: "shared", ids: ["pub", "draft"] } });
    eq(r.data.imported, 1); eq(r.data.refused[0].reason, "draft letter");
  });

  section("Jarvis");
  const J = { "X-Jarvis-Key": SECRETS.JARVIS_API_KEY };
  await test("no key is refused", async () => eq((await api("jarvis/execute", { body: { tool: "cupid_get_status" } })).status, 401));
  await test("the old public fallback keys no longer work", async () => {
    for (const k of ["cupid_jarvis_live_bridge_key", "cupid-forever-bridge-2024"]) eq((await api("jarvis/execute", { body: { tool: "cupid_get_status" }, headers: { "X-Jarvis-Key": k } })).status, 401);
  });
  await test("health without a key reveals no tool list", async () => assert(!(await api("jarvis/health")).data.tools, "no tools"));
  await test("an unknown tool is refused", async () => eq((await api("jarvis/execute", { body: { tool: "cupid_read_cycle_logs" }, headers: J })).status, 403));
  await test("unexpected parameters are refused", async () => eq((await api("jarvis/execute", { body: { tool: "cupid_add_memory", parameters: { date: "2026-01-01", title: "x", description: "y", userId: "razia_uid" } }, headers: J })).status, 400));
  await test("cupid_add_memory really writes to Our Story now", async () => {
    const r = await api("jarvis/execute", { body: { tool: "cupid_add_memory", parameters: { date: "2026-09-06", title: "Wedding", description: "We married" } }, headers: J });
    eq(r.status, 200);
    eq((await db.doc(`timeline_moments/${r.data.result.memoryId}`).get()).get("title"), "Wedding");
  });
  await test("drafted letters stay unpublished", async () => {
    const r = await api("jarvis/execute", { body: { tool: "cupid_draft_letter", parameters: { title: "T", content: "C" } }, headers: J });
    eq((await db.doc(`letters/${r.data.result.letterId}`).get()).get("isPublished"), false);
  });
  await test("Jarvis finds shared memories only", async () => {
    const r = await api("jarvis/execute", { body: { tool: "cupid_find_shared_memories", parameters: { limit: 25 } }, headers: J });
    const ids = r.data.result.memories.map((m: any) => m.id);
    assert(ids.includes(sharedPhotoId) && ids.includes(textId), "shared ones found");
    const priv = await db.collection("memories").where("visibility", "==", "private").get();
    assert(priv.docs.every((d) => !ids.includes(d.id)), "no private memory returned");
  });
  await test("asking for a private memory by id looks like it doesn't exist", async () => {
    const priv = await db.collection("memories").where("visibility", "==", "private").limit(1).get();
    eq((await api("jarvis/execute", { body: { tool: "cupid_get_memory", parameters: { id: priv.docs[0].id } }, headers: J })).status, 404);
  });
  await test("anniversary lookup finds memories on the same day across years", async () => {
    const r = await api("jarvis/execute", { body: { tool: "cupid_memories_on_date", parameters: { date: "11-05" } }, headers: J });
    assert(r.data.result.memories.length >= 2, "two years of 5 Nov");
  });
  let proposalId = "";
  await test("a proposed change waits for approval and changes nothing yet", async () => {
    const r = await api("jarvis/execute", { body: { tool: "cupid_propose_memory_change", parameters: { id: textId, caption: "Proposed by Jarvis", addTags: ["rain"] } }, headers: J });
    proposalId = r.data.result.proposalId;
    eq((await db.doc(`memories/${textId}`).get()).get("caption"), "The rain");
  });
  await test("only the memory's owner can approve it", async () => eq((await api("jarvis/proposals/decide", { as: "raaziq", body: { id: proposalId, approve: true } })).status, 403));
  await test("the owner approves and it is applied", async () => {
    eq((await api("jarvis/proposals/decide", { as: "razia", body: { id: proposalId, approve: true } })).status, 200);
    const m = await db.doc(`memories/${textId}`).get();
    eq(m.get("caption"), "Proposed by Jarvis"); assert(m.get("tags").includes("rain"), "tag added");
  });
  await test("every Jarvis call is in the audit log", async () => assert((await db.collection("jarvis_audit_logs").get()).size >= 8, "audited"));

  section("Inbound memory bridge");
  const B = { "X-Bridge-Secret": SECRETS.BRIDGE_SECRET };
  await test("no secret is refused", async () => eq((await api("memory-book/sync", { body: { title: "x", content: "y" } })).status, 401));
  await test("the old public secret is refused", async () => eq((await api("bridge/favorite", { body: { title: "x", content: "y" }, headers: { "X-Bridge-Secret": "cupid-forever-bridge-2024" } })).status, 401));
  await test("health content is refused", async () => eq((await api("memory-book/sync", { body: { title: "Notes", content: "her period started", externalId: "a" }, headers: B })).status, 403));
  await test("a valid entry is really stored", async () => {
    const r = await api("memory-book/sync", { body: { title: "Forever", content: "A day", date: "2026-02-14", category: "milestone", externalId: "fb-1", source: "forever-book" }, headers: B });
    eq(r.data.status, "stored");
    eq((await db.doc(`memory_book/${r.data.id}`).get()).get("title"), "Forever");
  });
  await test("the same entry twice is a duplicate, not a second copy", async () => {
    const r = await api("bridge/favorite", { body: { title: "Forever", content: "A day", externalId: "fb-1", source: "forever-book" }, headers: B });
    eq(r.data.status, "duplicate");
  });

  section("Letter drafting (Gemini)");
  const withKey = async (k: string) => { process.env.GEMINI_API_KEY = k; const r = await api("ai/letter", { as: "raaziq", body: { prompt: "Write" } }); process.env.GEMINI_API_KEY = "good"; return r; };
  await test("a working key returns a draft", async () => { const r = await withKey("good"); eq(r.status, 200); eq(r.data.provider, "gemini"); });
  await test("a leaked key is reported as such", async () => { const r = await withKey("leaked"); eq(r.data.code, "invalid_key"); assert(/leaked/.test(r.data.error), "says leaked"); });
  await test("an invalid key is reported", async () => eq((await withKey("invalid")).data.code, "invalid_key"));
  await test("a rate limit is reported as 429", async () => eq((await withKey("ratelimit")).status, 429));
  await test("an outage is reported", async () => eq((await withKey("outage")).data.code, "provider_down"));
  await test("a timeout is reported as 504", async () => eq((await withKey("slow")).status, 504));
  await test("with Ollama configured, an outage falls back to it", async () => {
    const ollama = await serve(() => ({ status: 200, json: { response: "From Ollama" } }));
    process.env.OLLAMA_API_URL = `${ollama.url}/api/generate`;
    const r = await withKey("outage");
    delete process.env.OLLAMA_API_URL; await ollama.close();
    eq(r.data.provider, "ollama"); eq(r.data.fallbackReason, "provider_down");
  });
  await test("a stranger cannot use the AI route", async () => eq((await api("ai/letter", { as: "stranger", body: { prompt: "x" } })).status, 403));

  section("Jarvis ecosystem ingestion");
  await test("the daily sync sends a heartbeat and today's activity log", async () => {
    const r = await api("cron/daily", { headers: { Authorization: `Bearer ${SECRETS.CRON_SECRET}` } });
    eq(r.status, 200); eq(r.data.ecosystem.heartbeat.ok, true);
    assert(JARVIS.state.pings.length >= 1, "pinged");
    assert([...JARVIS.state.knowledge.keys()].some((k) => k.startsWith("project-cupid-activity-")), "activity doc");
  });
  await test("the activity log carries no private content", async () => {
    const all = [...JARVIS.state.knowledge.values()].filter((d) => d.externalId.startsWith("project-cupid-activity-")).map((d) => d.content).join("\n");
    for (const secret of ["Sunset", "Gentle day", "Be soft with me", "alert(1)", "loved", RAZIA.email, "The rain"]) assert(!all.includes(secret), `log leaked "${secret}"`);
    assert(/notification/.test(all) && /memory/.test(all), "but it does describe activity");
  });
  await test("the cron route refuses a wrong secret", async () => eq((await api("cron/daily", { headers: { Authorization: "Bearer wrong" } })).status, 401));
  await test("only shared memories can be given to Jarvis, by their owner", async () => {
    eq((await api("memories/share-with-jarvis", { as: "razia", body: { id: sharedPhotoId } })).status, 403);
    eq((await api("memories/share-with-jarvis", { as: "raaziq", body: { id: sharedPhotoId } })).status, 200);
    assert(JARVIS.state.knowledge.has(`project-cupid-memory-${sharedPhotoId}`), "shared with Jarvis");
  });

  section("5.0 data migration");
  await test("a member left as 'reader' by 4.x is found by the audit", async () => {
    await adminAuth().createUser({ uid: "raaziq_old", email: "mraaziqp@gmail.com", emailVerified: true }).catch(() => {});
    await db.doc("users/raaziq_old").set({ uid: "raaziq_old", role: "reader", displayName: "Raaziq" });
    await adminAuth().createUser({ uid: "anon_old" }).catch(() => {});
    await db.doc("users/anon_old").set({ uid: "anon_old", email: "test-user@cupid.com", role: "reader" });
    const r = await api("admin/data-audit", { headers: { Authorization: `Bearer ${SECRETS.CRON_SECRET}` } });
    const p = r.data.people.find((x: any) => x.uid === "raaziq_old");
    eq(p.role, "reader"); eq(p.intendedRole, "admin"); eq(p.member, false);
    assert(typeof r.data.counts.letters === "number", "collection counts present");
  });
  await test("a dry run changes nothing", async () => {
    const r = await api("admin/migrate", { as: "raaziq", body: { steps: ["roles"] } });
    eq(r.data.roles.dryRun, true); eq(r.data.roles.changes.length, 1);
    eq((await db.doc("users/raaziq_old").get()).get("role"), "reader");
  });
  await test("the role fix restores only allowlisted accounts", async () => {
    const r = await api("admin/migrate", { as: "raaziq", body: { steps: ["roles"], dryRun: false } });
    eq(r.data.roles.changes.map((c: any) => c.uid), ["raaziq_old"]);
    eq((await db.doc("users/raaziq_old").get()).get("role"), "admin");
    eq((await db.doc("users/raaziq_old").get()).get("email"), "mraaziqp@gmail.com");
    eq((await db.doc("users/anon_old").get()).get("role"), "reader");
  });
  await test("Memory Book and Our Story are carried into the garden once, as shared memories", async () => {
    await db.doc("timeline_moments/t_old").set({ date: "October 2025", title: "First trip", description: "The coast", category: "adventure" });
    await db.doc("timeline_moments/t_wedding").set({ date: "2026-09-06", title: "Our wedding", description: "Nikah", category: "wedding" });
    await db.doc("timeline_moments/t_vague").set({ date: "the beginning", title: "When we met", description: "" });
    await db.doc("us_drops/d1").set({ userId: RAZIA.uid, category: "Gratitude", content: "Thank you for the tea", createdAt: new Date("2026-03-02T09:00:00Z") });
    const first = await api("admin/migrate", { as: "raaziq", body: { steps: ["garden"], dryRun: false } });
    assert(first.data.garden.created >= 4, `created ${first.data.garden.created}`);
    const second = await api("admin/migrate", { as: "raaziq", body: { steps: ["garden"], dryRun: false } });
    eq(second.data.garden.created, 0);
    const t = await db.collection("memories").where("source", "==", "timeline").get();
    const byTitle = Object.fromEntries(t.docs.map((d) => [d.get("title"), d.data()]));
    eq(byTitle["First trip"].memoryDate, "2025-10-01"); eq(byTitle["First trip"].datePrecision, "month");
    eq(byTitle["Our wedding"].isSpecialOccasion, true);
    assert(byTitle["When we met"].tags.includes("date unsure"), "unreadable date is flagged, not invented");
    assert(t.docs.every((d) => d.get("visibility") === "shared"), "shared");
    eq((await db.doc("timeline_moments/t_old").get()).exists, true);
    const drop = await db.collection("memories").where("source", "==", "us_drops").get();
    eq(drop.size, 1); eq(drop.docs[0].get("ownerId"), RAZIA.uid); eq(drop.docs[0].get("memoryDate"), "2026-03-02");
  });
  await test("the partner cannot run the migration", async () => eq((await api("admin/migrate", { as: "razia", body: {} })).status, 403));

  section("Diagnostics");
  await test("diagnostics report every check without revealing any secret", async () => {
    const r = await api("admin/diagnostics", { as: "raaziq" });
    eq(r.status, 200);
    const text = JSON.stringify(r.data);
    for (const v of Object.values(SECRETS)) assert(!text.includes(v), "a secret value appeared in diagnostics");
    eq(r.data.checks.resend.ok, true); eq(r.data.checks.gemini.ok, true); eq(r.data.checks.jarvis.ok, true); eq(r.data.checks.weddingapp.ok, true);
  });

  section("Moving Raaziq's old account to his main one");
  await test("a note to the partner is emailed, by the server's choice of address", async () => {
    RESEND.state.sent.length = 0;
    const r = await api("notify", { as: "raaziq", body: { kind: "note", title: "Hello love", body: "short", emailBody: "The whole note" } });
    eq(r.data.email.sent, 1); eq(RESEND.state.sent[0].to, [RAZIA.email]); assert(RESEND.state.sent[0].text.includes("The whole note"), "full text sent");
  });
  await test("only an admin can move accounts", async () => eq((await api("admin/transfer-account", { as: "razia", body: {} })).status, 403));
  await db.doc(`letters/old_letter`).set({ title: "Old", content: "x", isPublished: true, authorId: RAAZIQ.uid, createdAt: new Date() });
  await db.doc(`weather/${RAAZIQ.uid}-2026-01-01`).set({ userId: RAAZIQ.uid, date: "2026-01-01", emotion: "Calm" });
  await db.doc("memories/old_memory").set({ ownerId: RAAZIQ.uid, visibility: "shared", title: "Old", caption: "", memoryDate: "2026-01-01", datePrecision: "day", mediaType: "text", media: [], tags: [], collectionIds: [], favouritedBy: [RAAZIQ.uid, RAZIA.uid], isSpecialOccasion: false, status: "organised", source: "cupid", provenance: { importedBy: RAAZIQ.uid } });
  await db.doc("letters/hers").set({ title: "Hers", content: "x", isPublished: true, authorId: RAZIA.uid });
  const beforeLetters = (await db.collection("letters").get()).size;
  await test("a dry run reports the move and changes nothing", async () => {
    const r = await api("admin/transfer-account", { as: "raaziq", body: {} });
    eq(r.data.dryRun, true); assert(r.data.moved.letters >= 1, "letters counted");
    eq((await db.doc("letters/old_letter").get()).get("authorId"), RAAZIQ.uid);
  });
  await test("everything moves to the main account and nothing is lost", async () => {
    const r = await api("admin/transfer-account", { as: "raaziq", body: { dryRun: false } });
    eq(r.data.dryRun, false); eq(r.data.retiresOldAccount, true);
    eq((await db.doc("letters/old_letter").get()).get("authorId"), "raaziq_old");
    eq((await db.doc("letters/hers").get()).get("authorId"), RAZIA.uid);
    eq((await db.collection("letters").get()).size, beforeLetters);
    eq((await db.doc(`weather/${RAAZIQ.uid}-2026-01-01`).get()).exists, false);
    eq((await db.doc("weather/raaziq_old-2026-01-01").get()).get("userId"), "raaziq_old");
    const m = await db.doc("memories/old_memory").get();
    eq(m.get("ownerId"), "raaziq_old"); eq(m.get("favouritedBy"), ["raaziq_old", RAZIA.uid]); eq(m.get("provenance.importedBy"), "raaziq_old");
  });
  await test("the old account no longer has access", async () => {
    eq((await db.doc(`users/${RAAZIQ.uid}`).get()).get("role"), "retired");
    eq((await api("ecosystem/status", { as: "raaziq" })).status, 403);
  });
  await test("the main account still works, and Razia's mail now names only it", async () => {
    tokens.main = await idTokenFor("raaziq_old");
    eq((await api("ecosystem/status", { as: "main" })).status, 200);
    RESEND.state.sent.length = 0;
    const r = await api("notify", { as: "razia", body: { kind: "note", title: "Hi", body: "x" } });
    eq(r.data.email.sent, 1); eq(RESEND.state.sent[0].to, ["mraaziqp@gmail.com"]);
  });
  await test("running it again changes nothing", async () => {
    const r = await api("admin/transfer-account", { as: "main", body: { dryRun: false } });
    eq(r.data.moved, {}); eq(r.data.retiresOldAccount, false);
  });

  server.close();
  await Promise.all(fakes.map((f) => f.close()));
  process.exit(summary("CUPID API INTEGRATION (EMULATORS + FAKE SERVICES)"));
}

main().catch((e) => { console.error(e); process.exit(1); });
