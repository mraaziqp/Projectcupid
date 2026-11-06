/**
 * SaveState client. SaveState (savestate.co.za) is Raaziq's self-hosted media
 * and games server: Express + Postgres, username/password accounts, 30-day
 * HS256 session tokens, and a host-wide "Photo Booklet" of albums.
 *
 * Cupid uses it for three things, always as the signed-in member's own
 * SaveState account so SaveState's own permission checks still apply:
 *   - sign-in (the member's SaveState username and password),
 *   - photos (the member's profile images, the booklet, and Cupid's own album),
 *   - mail (SaveState's notification relay, which sends through its Resend domain).
 */
import { env } from "./config.js";
import { fetchWithTimeout, HttpError } from "./http.js";

export interface SaveStateUser {
  id: string;
  username: string;
  display_name: string | null;
  role: string | null;
  email: string | null;
  avatar?: string | null;
  avatar_color?: string | null;
  bio?: string | null;
  media_access?: boolean;
  can_upload_media?: boolean;
}

export interface SaveStateAlbum {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  photoCount?: number;
  hasPin?: boolean;
  coverPhoto?: SaveStatePhoto | null;
}

export interface SaveStatePhoto {
  id: string;
  albumId: string;
  filename: string;
  originalName?: string;
  size?: number;
  uploadedAt?: string;
  caption?: string;
}

const base = () => env.savestateUrl;

async function call(path: string, init: RequestInit & { token?: string; timeoutMs?: number; albumPin?: string } = {}) {
  const { token, albumPin, headers, ...rest } = init;
  const h: Record<string, string> = { Accept: "application/json", ...(headers as Record<string, string> | undefined) };
  if (token) h.Authorization = `Bearer ${token}`;
  if (albumPin) h["X-Album-Pin"] = albumPin;
  try {
    return await fetchWithTimeout(base() + path, { ...rest, headers: h, timeoutMs: init.timeoutMs ?? 12_000 });
  } catch (e: any) {
    throw new HttpError(503, e?.name === "TimeoutError" ? "SaveState did not answer in time." : "SaveState is not reachable right now.", "savestate_unreachable");
  }
}

async function json(r: Response): Promise<any> {
  return r.json().catch(() => ({}));
}

function fail(r: Response, body: any, fallback: string): never {
  if (r.status === 401) throw new HttpError(401, body?.error || "SaveState did not accept that sign-in.", "savestate_auth");
  if (r.status === 403) throw new HttpError(403, body?.error || "SaveState refused this request.", "savestate_forbidden");
  if (r.status === 429) throw new HttpError(429, body?.error || "Too many attempts. Try again in a few minutes.", "rate_limited");
  if (r.status >= 500) throw new HttpError(503, body?.error || "SaveState is having trouble right now.", "savestate_unavailable");
  throw new HttpError(r.status || 502, body?.error || fallback, "savestate_error");
}

export async function login(identifier: string, password: string): Promise<{ token: string; user: SaveStateUser }> {
  const r = await call("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: identifier, password }),
  });
  const body = await json(r);
  if (!r.ok || !body?.token || !body?.user?.id) fail(r, body, "SaveState sign-in failed.");
  return { token: body.token, user: body.user };
}

export async function me(token: string): Promise<SaveStateUser> {
  const r = await call("/api/auth/me", { token });
  const body = await json(r);
  if (!r.ok || !body?.user?.id) fail(r, body, "Could not load the SaveState account.");
  return body.user;
}

/** Swaps a token for a fresh 30-day one (SaveState's sliding sessions). */
export async function refresh(token: string): Promise<string> {
  const r = await call("/api/auth/refresh", { method: "POST", token });
  const body = await json(r);
  if (!r.ok || !body?.token) fail(r, body, "Could not refresh the SaveState session.");
  return body.token;
}

export async function profileImages(token: string): Promise<Array<{ id: string; is_public: boolean; uploaded_at?: string; caption?: string }>> {
  const r = await call("/api/profile-images/me", { token });
  const body = await json(r);
  if (!r.ok) fail(r, body, "Could not load SaveState profile images.");
  return Array.isArray(body?.images) ? body.images : [];
}

export async function profileImageFile(token: string, id: string): Promise<Response> {
  const r = await call(`/api/profile-images/file?id=${encodeURIComponent(id)}`, { token, headers: { Accept: "*/*" } });
  if (!r.ok) fail(r, await json(r), "Image not available.");
  return r;
}

export async function listAlbums(token: string): Promise<SaveStateAlbum[]> {
  const r = await call("/api/photos/albums", { token });
  const body = await json(r);
  if (!r.ok) fail(r, body, "Could not load SaveState albums.");
  return Array.isArray(body?.albums) ? body.albums : [];
}

export async function listAlbumPhotos(token: string, albumId: string, albumPin?: string): Promise<SaveStatePhoto[]> {
  const r = await call(`/api/photos/albums/${encodeURIComponent(albumId)}/photos`, { token, albumPin });
  const body = await json(r);
  if (!r.ok) {
    if (body?.albumPinRequired) throw new HttpError(403, "This SaveState album is PIN-locked, so Cupid treats it as private.", "album_locked");
    fail(r, body, "Could not load the album.");
  }
  return Array.isArray(body?.photos) ? body.photos : [];
}

export async function createAlbum(token: string, name: string, description: string): Promise<SaveStateAlbum> {
  const r = await call("/api/photos/albums", {
    method: "POST", token, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, description }),
  });
  const body = await json(r);
  if (!r.ok || !body?.album?.id) fail(r, body, "Could not create the SaveState album.");
  return body.album;
}

export async function setAlbumPin(token: string, albumId: string, pin: string): Promise<void> {
  const r = await call(`/api/photos/albums/${encodeURIComponent(albumId)}/pin`, {
    method: "POST", token, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin }),
  });
  if (!r.ok) fail(r, await json(r), "Could not lock the SaveState album.");
}

export async function uploadPhoto(token: string, albumId: string, filename: string, bytes: Buffer, mime: string): Promise<SaveStatePhoto> {
  const r = await call(`/api/photos/albums/${encodeURIComponent(albumId)}/photos?filename=${encodeURIComponent(filename)}`, {
    method: "POST", token, headers: { "Content-Type": mime || "application/octet-stream" }, body: new Uint8Array(bytes), timeoutMs: 45_000,
  });
  const body = await json(r);
  if (!r.ok || !body?.photo?.id) fail(r, body, "SaveState did not store the file.");
  return body.photo;
}

export async function deletePhoto(token: string, albumId: string, photoId: string): Promise<void> {
  const r = await call(`/api/photos/albums/${encodeURIComponent(albumId)}/photos/${encodeURIComponent(photoId)}`, { method: "DELETE", token });
  if (!r.ok && r.status !== 404) fail(r, await json(r), "Could not delete the file from SaveState.");
}

/** Raw file bytes from the booklet. `w` asks SaveState for a resized JPEG. */
export async function photoFile(opts: { token?: string; albumId: string; filename: string; albumPin?: string; w?: number }): Promise<Response> {
  const q = new URLSearchParams({ albumId: opts.albumId, filename: opts.filename });
  if (opts.w) { q.set("thumb", "1"); q.set("w", String(opts.w)); }
  if (opts.albumPin) q.set("albumPin", opts.albumPin);
  const r = await call(`/api/photos/file?${q}`, { token: opts.token, headers: { Accept: "*/*" }, timeoutMs: 30_000 });
  if (!r.ok) {
    const body = await json(r);
    if (r.status === 404) throw new HttpError(404, "The file is no longer in SaveState.", "media_missing");
    fail(r, body, "SaveState could not serve the file.");
  }
  return r;
}

/**
 * SaveState's mail relay (/api/notify/send). It sends through SaveState's
 * verified Resend domain, falling back from AwehChat; we only ever give it an
 * email address so it goes straight to Resend.
 */
export async function sendMail(token: string, mail: { to: string; subject: string; text: string; html: string; eventType: string }): Promise<{ ok: boolean; detail: string }> {
  const r = await call("/api/notify/send", {
    method: "POST",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to_email: mail.to, subject: mail.subject, body: mail.text, html: mail.html, event_type: `cupid.${mail.eventType}` }),
    timeoutMs: 20_000,
  });
  const body = await json(r);
  if (!r.ok) return { ok: false, detail: `SaveState relay answered ${r.status}${body?.error ? `: ${body.error}` : ""}` };
  return { ok: !!body?.resend, detail: body?.resend ? "sent by SaveState (Resend)" : "SaveState accepted the request but Resend did not send it" };
}

export async function health(): Promise<{ up: boolean; detail: string }> {
  try {
    const r = await fetchWithTimeout(base() + "/api/auth/config", { timeoutMs: 6000 });
    const b = await r.json().catch(() => ({}));
    return { up: r.ok, detail: r.ok ? `reachable; mail ${b?.emailReset ? "configured" : "not configured"}` : `answered ${r.status}` };
  } catch {
    return { up: false, detail: "not reachable" };
  }
}
