/**
 * Local stand-ins for the services Cupid talks to, with the same request and
 * response shapes as the real ones (read from their source code):
 * SaveState (savestate repo server.ts), Resend, Gemini, Jarvis (Second Brain
 * app/api/ecosystem/*) and WeddingApp's Supabase REST API.
 */
import http from "node:http";
import type { AddressInfo } from "node:net";

type Handler = (req: http.IncomingMessage, url: URL, body: Buffer) => { status: number; json?: any; bytes?: Buffer; type?: string; delayMs?: number; destroy?: boolean } | Promise<any>;

export async function serve(handler: Handler): Promise<{ url: string; close: () => Promise<void> }> {
  const server = http.createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    const url = new URL(req.url ?? "/", "http://fake");
    const out = await handler(req, url, Buffer.concat(chunks));
    if (out.delayMs) await new Promise((r) => setTimeout(r, out.delayMs));
    if (out.destroy) { req.socket.destroy(); return; }
    res.statusCode = out.status;
    if (out.bytes) { res.setHeader("Content-Type", out.type ?? "application/octet-stream"); res.setHeader("Content-Length", out.bytes.length); res.end(out.bytes); return; }
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(out.json ?? {}));
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address() as AddressInfo;
  return { url: `http://127.0.0.1:${port}`, close: () => new Promise((r) => server.close(() => r())) };
}

export const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200, 7)]);
export const MP4 = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftypisom"), Buffer.alloc(200, 1)]);

// ── SaveState ───────────────────────────────────────────────────────────────
export function fakeSaveState() {
  const users: Record<string, { id: string; username: string; password: string; display_name: string; email: string | null; role: string }> = {
    mraaziqp: { id: "ss-raaziq", username: "mraaziqp", password: "right-pass", display_name: "Raaziq", email: null, role: "ultra_admin" },
    razia: { id: "ss-razia", username: "razia", password: "her-pass", display_name: "Razia ❤️", email: null, role: "admin" },
    // Someone who registered on SaveState with Razia's email (SaveState doesn't verify emails).
    impostor: { id: "ss-impostor", username: "impostor", password: "x-pass-123", display_name: "Not Razia", email: "raziashade4@gmail.com", role: "user" },
  };
  const state = {
    down: false,
    mailWorks: true,
    mails: [] as any[],
    albums: [
      { id: "alb-family", name: "Family", description: "", createdAt: "2026-01-01T00:00:00Z", pin: null as string | null },
      { id: "alb-locked", name: "Locked", description: "", createdAt: "2026-01-01T00:00:00Z", pin: "1234" },
    ],
    photos: [
      { id: "p1", albumId: "alb-family", filename: "p1.jpg", originalName: "Picnic.jpg", size: JPEG.length, uploadedAt: "2025-12-25T10:00:00Z", caption: "Picnic", bytes: JPEG },
      { id: "p2", albumId: "alb-family", filename: "p2.mp4", originalName: "Dance.mp4", size: MP4.length, uploadedAt: "2025-12-26T10:00:00Z", caption: "", bytes: MP4 },
      { id: "p3", albumId: "alb-locked", filename: "p3.jpg", originalName: "Secret.jpg", size: JPEG.length, uploadedAt: "2025-12-27T10:00:00Z", caption: "", bytes: JPEG },
    ] as any[],
    profileImages: [
      { id: "img-pub", user_id: "ss-raaziq", is_public: true, bytes: JPEG },
      { id: "img-priv", user_id: "ss-raaziq", is_public: false, bytes: JPEG },
    ],
  };
  const userFor = (req: http.IncomingMessage) => {
    const t = String(req.headers.authorization ?? "").replace(/^Bearer /, "");
    const id = t.replace(/^tok2?-/, "");
    return Object.values(users).find((u) => u.id === id && /^tok2?-/.test(t)) ?? null;
  };
  const albumOut = (a: any) => {
    const ps = state.photos.filter((p) => p.albumId === a.id);
    const last = ps[ps.length - 1];
    return { id: a.id, name: a.name, description: a.description, createdAt: a.createdAt, photoCount: ps.length, hasPin: !!a.pin, coverPhoto: last ? { ...last, bytes: undefined } : null };
  };

  const handler: Handler = (req, url, body) => {
    if (state.down) return { status: 0, destroy: true };
    const p = url.pathname;
    const json = () => (body.length ? JSON.parse(body.toString()) : {});
    if (p === "/api/auth/config") return { status: 200, json: { emailReset: true } };
    if (p === "/api/auth/login" && req.method === "POST") {
      const b = json();
      const u = users[String(b.username)];
      if (!u || u.password !== b.password) return { status: 401, json: { error: "That username and password don't match." } };
      return { status: 200, json: { token: `tok-${u.id}`, user: { id: u.id, username: u.username, display_name: u.display_name, role: u.role, email: u.email } } };
    }
    const me = userFor(req);
    if (p === "/api/auth/me") return me ? { status: 200, json: { user: { ...me, password: undefined, media_access: true, can_upload_media: true, avatar: "🌸", avatar_color: "#aa3366" } } } : { status: 401, json: { error: "No token" } };
    if (p === "/api/auth/refresh") return me ? { status: 200, json: { token: `tok2-${me.id}` } } : { status: 400, json: { error: "Nothing to refresh" } };
    if (p === "/api/notify/send" && req.method === "POST") {
      if (!me) return { status: 401, json: { error: "Login required" } };
      state.mails.push({ ...json(), from: me.username });
      return { status: 200, json: { ok: state.mailWorks, awehchat: false, resend: state.mailWorks } };
    }
    if (p === "/api/profile-images/me") return me ? { status: 200, json: { images: state.profileImages.filter((i) => i.user_id === me.id).map((i) => ({ id: i.id, is_public: i.is_public })) } } : { status: 401, json: {} };
    if (p === "/api/profile-images/file") {
      const img = state.profileImages.find((i) => i.id === url.searchParams.get("id"));
      if (!img) return { status: 404, json: {} };
      if (!img.is_public && me?.id !== img.user_id) return { status: 403, json: { error: "Private image access forbidden" } };
      return { status: 200, bytes: img.bytes, type: "image/jpeg" };
    }
    if (p === "/api/photos/file") {
      const a = state.albums.find((x) => x.id === url.searchParams.get("albumId"));
      if (a?.pin && url.searchParams.get("albumPin") !== a.pin) return { status: 401, json: { error: "Album PIN required", albumPinRequired: true } };
      const ph = state.photos.find((x) => x.albumId === a?.id && x.filename === url.searchParams.get("filename"));
      if (!ph) return { status: 404, json: { error: "Photo not found" } };
      return { status: 200, bytes: ph.bytes, type: ph.filename.endsWith(".mp4") ? "video/mp4" : ph.filename.endsWith(".png") ? "image/png" : "image/jpeg" };
    }
    if (!me) return { status: 401, json: { error: "Authentication required." } };
    if (p === "/api/photos/albums" && req.method === "GET") return { status: 200, json: { albums: state.albums.map(albumOut) } };
    if (p === "/api/photos/albums" && req.method === "POST") {
      const a = { id: `alb-${state.albums.length + 1}`, name: json().name, description: json().description, createdAt: new Date().toISOString(), pin: null };
      state.albums.push(a);
      return { status: 200, json: { ok: true, album: albumOut(a) } };
    }
    const m = p.match(/^\/api\/photos\/albums\/([^/]+)(\/pin|\/photos(?:\/([^/]+))?)?$/);
    if (m) {
      const a = state.albums.find((x) => x.id === m[1]);
      if (!a) return { status: 404, json: { error: "Album not found" } };
      if (m[2] === "/pin") { a.pin = json().pin; return { status: 200, json: { ok: true } }; }
      if (m[2] === "/photos" && req.method === "GET") {
        if (a.pin && req.headers["x-album-pin"] !== a.pin) return { status: 401, json: { error: "Album PIN required", albumPinRequired: true } };
        return { status: 200, json: { photos: state.photos.filter((x) => x.albumId === a.id).map((x) => ({ ...x, bytes: undefined })) } };
      }
      if (m[2] === "/photos" && req.method === "POST") {
        const id = `ph${state.photos.length + 1}`;
        const name = url.searchParams.get("filename") ?? "x.jpg";
        const entry = { id, albumId: a.id, filename: `${id}${name.slice(name.lastIndexOf("."))}`, originalName: name, size: body.length, uploadedAt: new Date().toISOString(), caption: "", bytes: body };
        state.photos.push(entry);
        return { status: 200, json: { ok: true, photo: { ...entry, bytes: undefined } } };
      }
      if (m[3] && req.method === "DELETE") {
        const before = state.photos.length;
        state.photos = state.photos.filter((x) => !(x.id === m[3] && x.albumId === a.id));
        return { status: before === state.photos.length ? 404 : 200, json: { ok: true } };
      }
    }
    return { status: 404, json: { error: "No such API route" } };
  };
  return { users, state, handler };
}

// ── Resend ──────────────────────────────────────────────────────────────────
export function fakeResend() {
  const state = { sent: [] as any[], works: true };
  const handler: Handler = (req, url, body) => {
    if (req.headers.authorization !== "Bearer re_test_key") return { status: 401, json: { name: "invalid_api_key" } };
    if (url.pathname === "/domains") return { status: 200, json: { data: [{ id: "d1", name: "savestate.co.za", status: "partially_failed" }] } };
    if (url.pathname === "/domains/d1") return { status: 200, json: { records: [{ record: "DKIM", type: "TXT", name: "resend._domainkey", status: "verified" }, { record: "SPF", type: "MX", name: "send", status: "verified" }, { record: "SPF", type: "TXT", name: "send", status: "verified" }, { record: "SPF", type: "CNAME", name: "rsend", status: "failed" }] } };
    if (url.pathname === "/emails" && req.method === "POST") {
      if (!state.works) return { status: 500, json: { name: "internal_server_error" } };
      state.sent.push(JSON.parse(body.toString()));
      return { status: 200, json: { id: `email_${state.sent.length}` } };
    }
    return { status: 404, json: {} };
  };
  return { state, handler };
}

// ── Gemini ──────────────────────────────────────────────────────────────────
export function fakeGemini() {
  const handler: Handler = (req) => {
    const key = req.headers["x-goog-api-key"];
    if (key === "leaked") return { status: 403, json: { error: { code: 403, message: "Your API key was reported as leaked. Please use another API key.", status: "PERMISSION_DENIED" } } };
    if (key === "invalid") return { status: 400, json: { error: { code: 400, message: "API key not valid. Please pass a valid API key.", status: "INVALID_ARGUMENT", details: [{ reason: "API_KEY_INVALID" }] } } };
    if (key === "ratelimit") return { status: 429, json: { error: { code: 429, status: "RESOURCE_EXHAUSTED" } } };
    if (key === "outage") return { status: 503, json: { error: { code: 503, status: "UNAVAILABLE" } } };
    if (key === "slow") return { status: 200, delayMs: 3000, json: {} };
    return { status: 200, json: { candidates: [{ content: { parts: [{ text: "My dearest Razia," }] } }] } };
  };
  return { handler };
}

// ── Jarvis ──────────────────────────────────────────────────────────────────
export function fakeJarvis() {
  const state = { pings: [] as any[], knowledge: new Map<string, any>() };
  const handler: Handler = (req, url, body) => {
    if (req.headers["x-jarvis-api-key"] !== "jb_live_sk_test") return { status: 401, json: { error: "Invalid API key" } };
    if (url.pathname === "/api/ecosystem/integrations/ping") {
      if (req.method === "POST") state.pings.push(JSON.parse(body.toString()));
      return { status: 200, json: { authenticated: true, status: "acknowledged", app: { name: "Project Cupid", permissions: ["ingest_events", "read_logs"] } } };
    }
    if (url.pathname === "/api/ecosystem/knowledge" && req.method === "POST") {
      const b = JSON.parse(body.toString());
      const created = !state.knowledge.has(b.externalId);
      state.knowledge.set(b.externalId, b);
      return { status: 200, json: { ok: true, id: "1", created } };
    }
    return { status: 404, json: {} };
  };
  return { state, handler };
}

// ── WeddingApp (its public media API, as in weddingapp3.0 src/app/api/media) ──
export function fakeWedding() {
  const items = [
    { id: "wed_public_photo_1", url: "/api/media/wed_public_photo_1/raw", name: "a.jpg", mimeType: "image/jpeg", size: 200, createdAt: "2026-09-12T16:44:26.382Z", visibility: "public", kind: "photo", caption: null, album: "Nikkah", hidden: false, source: "photographer", guestName: "Razia & Abduraziq", questTag: null },
    { id: "wed_public_video_2", url: "/api/media/wed_public_video_2/raw", name: "b.mp4", mimeType: "video/mp4", size: 400, createdAt: "2026-09-05T19:49:09.487Z", visibility: "public", kind: "video", caption: "First dance", album: null, hidden: false, source: "guest", guestName: null, questTag: null },
    // A broken or hostile list must not get these through.
    { id: "wed_private_photo3", url: "/api/media/wed_private_photo3/raw", name: "c.jpg", mimeType: "image/jpeg", size: 200, createdAt: "2026-09-06T19:00:00Z", visibility: "private", kind: "photo", caption: null, album: null, hidden: false, source: "guest", guestName: null, questTag: null },
    { id: "wed_hidden_photo_4", url: "/api/media/wed_hidden_photo_4/raw", name: "d.jpg", mimeType: "image/jpeg", size: 200, createdAt: "2026-09-06T20:00:00Z", visibility: "public", kind: "photo", caption: null, album: null, hidden: true, source: "guest", guestName: null, questTag: null },
  ];
  const state = { down: false };
  const handler: Handler = (_req, url) => {
    if (state.down) return { status: 503, json: { error: "down" } };
    if (url.pathname === "/api/media") {
      if (url.searchParams.get("visibility") !== "public") return { status: 401, json: { error: "Unauthorized" } };
      if (url.searchParams.get("count")) return { status: 200, json: { count: items.length, configured: true } };
      return { status: 200, json: { items, count: items.length, nextPageToken: null, configured: true } };
    }
    if (url.pathname === "/_next/image") return { status: 200, bytes: JPEG, type: "image/jpeg" };
    if (url.pathname.endsWith("/raw")) return { status: 200, bytes: url.pathname.includes("video") ? MP4 : JPEG, type: url.pathname.includes("video") ? "video/mp4" : "image/jpeg" };
    return { status: 404, json: {} };
  };
  return { items, state, handler };
}
