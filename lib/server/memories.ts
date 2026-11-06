/**
 * The Memory Garden on the server: creating memories with media, serving
 * media to the people allowed to see it, and the source adapters
 * (SaveState booklet, WeddingApp, Cupid's own Memory Book and letters).
 *
 * Media lives in SaveState. Cupid's own uploads go to one PIN-locked SaveState
 * album, and are only ever served back through `mediaFor`, which checks the
 * memory's visibility first. Imports keep a reference to the original — Cupid
 * never copies a source's files and never writes back to a source.
 */
import { FieldValue, type DocumentSnapshot } from "firebase-admin/firestore";
import { adminDb } from "./firebaseAdmin.js";
import { env } from "./config.js";
import { fetchWithTimeout, HttpError, text } from "./http.js";
import { randomId } from "./crypto.js";
import * as ss from "./savestate.js";
import { hasSaveState, saveStateToken } from "./identity.js";
import { logEvent } from "./ecosystem.js";
import { sideOf, type Member } from "./authz.js";
import {
  EXT, importDocId, isValidMemoryDate, parseLooseDate, MEDIA_TYPES, normaliseTags, validateUpload,
  type MediaRef, type MediaType, type MemorySource, type UploadKind, type Visibility,
} from "../../src/lib/memoryGarden/model.js";

const MEMORIES = "memories";
const CONFIG = adminDb;
const ALBUM_NAME = "Project Cupid · Memory Garden";
/** 1×1 transparent PNG, kept as the album's newest file so SaveState's album list never previews a real photo. */
const COVER_PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");

// ── Cupid's album in SaveState ─────────────────────────────────────────────

async function cupidAlbum(token: string): Promise<string> {
  const pin = env.savestateAlbumPin;
  if (!pin || pin.length < 16) throw new HttpError(503, "CUPID_SAVESTATE_ALBUM_PIN is not configured.", "not_configured");
  const ref = CONFIG().collection("integration_config").doc("savestate");
  const snap = await ref.get();
  const known = snap.get("albumId") as string | undefined;
  if (known) return known;
  const album = await ss.createAlbum(token, ALBUM_NAME, "Private to Project Cupid. Photos here are shown only inside Cupid.");
  await ss.setAlbumPin(token, album.id, pin);
  await ref.set({ albumId: album.id, createdAt: FieldValue.serverTimestamp() }, { merge: true });
  return album.id;
}

async function refreshCover(token: string, albumId: string) {
  const ref = CONFIG().collection("integration_config").doc("savestate");
  const old = (await ref.get()).get("coverPhotoId") as string | undefined;
  try {
    const cover = await ss.uploadPhoto(token, albumId, "cover.png", COVER_PNG, "image/png");
    await ref.set({ coverPhotoId: cover.id }, { merge: true });
    if (old) await ss.deletePhoto(token, albumId, old);
  } catch (e: any) {
    console.warn("[memories] cover refresh failed:", e?.message);
  }
}

export async function storeMedia(member: Member, kind: UploadKind, base64: string): Promise<MediaRef> {
  if (typeof base64 !== "string" || !base64) throw new HttpError(400, "No file was sent.");
  const bytes = Buffer.from(base64.replace(/^data:[^,]*,/, ""), "base64");
  const check = validateUpload(kind, bytes);
  if (!check.ok) throw new HttpError(422, check.error, "invalid_media");
  const token = await saveStateToken(member.uid);
  const albumId = await cupidAlbum(token);
  const mime = check.mime!;
  const filename = `cupid-${randomId(9)}${EXT[mime] ?? ""}`;
  const photo = await ss.uploadPhoto(token, albumId, filename, bytes, mime);
  await refreshCover(token, albumId);
  return { store: "savestate", kind, mime, size: bytes.length, ref: { albumId, photoId: photo.id, filename: photo.filename } };
}

// ── Creating and changing memories ─────────────────────────────────────────

function cleanThumb(v: unknown): string | null {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v !== "string" || !/^data:image\/(jpeg|webp|png);base64,[A-Za-z0-9+/=]+$/.test(v) || v.length > 120_000) {
    throw new HttpError(400, "The preview image is not a small JPEG/WebP/PNG.");
  }
  return v;
}

function visibilityOf(v: unknown): Visibility {
  if (v !== "shared" && v !== "private") throw new HttpError(400, "Choose whether this memory is shared or private to you.");
  return v;
}

export async function createMemory(member: Member, body: Record<string, any>) {
  const visibility = visibilityOf(body.visibility);
  const memoryDate = isValidMemoryDate(body.memoryDate) ? body.memoryDate : new Date().toISOString().slice(0, 10);
  const mediaType: MediaType = MEDIA_TYPES.includes(body.mediaType) ? body.mediaType : "text";
  const media: MediaRef[] = [];
  if (body.file) {
    const kind = (["photo", "video", "voice"] as const).find((k) => k === body.file.kind);
    if (!kind) throw new HttpError(400, "Unknown media kind.");
    media.push(await storeMedia(member, kind, body.file.data));
  }
  const ref = adminDb().collection(MEMORIES).doc();
  const doc = {
    ownerId: member.uid,
    visibility,
    title: text(body.title, 120) || (media.length ? "A little moment" : "A memory"),
    caption: text(body.caption, 4000),
    memoryDate,
    datePrecision: ["day", "month", "year"].includes(body.datePrecision) ? body.datePrecision : "day",
    mediaType: media[0]?.kind ?? mediaType,
    media,
    thumbnail: cleanThumb(body.thumbnail),
    tags: normaliseTags(body.tags),
    location: text(body.location, 120) || null,
    collectionIds: [],
    favouritedBy: [],
    isSpecialOccasion: body.isSpecialOccasion === true,
    status: body.organise === true ? "organised" : "inbox",
    source: "cupid" as MemorySource,
    sourceRecordId: null,
    provenance: { label: "Saved in Project Cupid" },
    lastOpenedAt: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  await ref.set(doc);
  void logEvent({ kind: "memory", actor: sideOf(member.role), summary: `${visibility} ${doc.mediaType} memory saved` });
  return { id: ref.id, ...doc, createdAt: null, updatedAt: null };
}

async function readable(member: Member, id: string) {
  const snap = await adminDb().collection(MEMORIES).doc(id).get();
  if (!snap.exists) throw new HttpError(404, "That memory doesn't exist any more.", "not_found");
  const m = snap.data()!;
  if (m.visibility !== "shared" && m.ownerId !== member.uid) throw new HttpError(404, "That memory doesn't exist any more.", "not_found");
  return { ref: snap.ref, m };
}

export async function addMedia(member: Member, id: string, file: { kind: string; data: string }, thumbnail?: string) {
  const { ref, m } = await readable(member, id);
  if (m.ownerId !== member.uid) throw new HttpError(403, "Only the person who saved this memory can add to it.");
  if ((m.media ?? []).length >= 12) throw new HttpError(400, "A memory can hold up to 12 files.");
  const kind = (["photo", "video", "voice"] as const).find((k) => k === file?.kind);
  if (!kind) throw new HttpError(400, "Unknown media kind.");
  const media = await storeMedia(member, kind, file.data);
  await ref.update({
    media: FieldValue.arrayUnion(media),
    ...(m.thumbnail ? {} : { thumbnail: cleanThumb(thumbnail) }),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return media;
}

/** Deletes Cupid's copy. Files in Cupid's own album go too; imported originals are never touched. */
export async function deleteMemory(member: Member, id: string) {
  const { ref, m } = await readable(member, id);
  if (m.ownerId !== member.uid) throw new HttpError(403, "Only the person who saved this memory can delete it.");
  const albumId = (await adminDb().collection("integration_config").doc("savestate").get()).get("albumId");
  const own = (m.media as MediaRef[] ?? []).filter((x) => x.store === "savestate" && x.ref.albumId === albumId && m.source === "cupid");
  if (own.length) {
    try {
      const token = await saveStateToken(member.uid);
      for (const x of own) await ss.deletePhoto(token, x.ref.albumId!, x.ref.photoId!);
    } catch (e: any) {
      throw new HttpError(409, `The photo couldn't be removed from SaveState (${e?.message ?? "error"}), so the memory was kept. Try again.`, "media_delete_failed");
    }
  }
  const batch = adminDb().batch();
  for (const coll of ["memory_perspectives", "memory_reactions"]) {
    const rel = await adminDb().collection(coll).where("memoryId", "==", id).get();
    rel.docs.forEach((d) => batch.delete(d.ref));
  }
  batch.delete(ref);
  await batch.commit();
  void logEvent({ kind: "memory", actor: sideOf(member.role), summary: "memory deleted" });
}

// ── Serving media ──────────────────────────────────────────────────────────

export async function mediaFor(member: Member, id: string, index: number, size: "thumb" | "full") {
  const { m } = await readable(member, id);
  const media = (m.media as MediaRef[] ?? [])[index];
  if (!media) throw new HttpError(404, "No such file on this memory.", "not_found");

  if (media.store === "savestate") {
    let token: string | undefined;
    try { token = await saveStateToken(m.ownerId); } catch { /* the booklet serves without a token */ }
    const albumId = (await adminDb().collection("integration_config").doc("savestate").get()).get("albumId");
    const r = await ss.photoFile({
      token,
      albumId: media.ref.albumId!,
      filename: media.ref.filename!,
      albumPin: media.ref.albumId === albumId ? env.savestateAlbumPin : undefined,
      w: media.kind === "photo" ? (size === "thumb" ? 480 : 1600) : undefined,
    });
    return { response: r, mime: media.kind === "photo" && r.headers.get("content-type")?.startsWith("image/") ? r.headers.get("content-type")! : media.mime };
  }
  if (media.store === "weddingapp") {
    const id = media.ref.rowId!;
    const item = await weddingItem(id);
    if (!item) throw new HttpError(404, "WeddingApp no longer shares this file.", "media_missing");
    const r = await fetchWithTimeout(media.kind === "photo" ? weddingImageUrl(id, size === "thumb" ? 640 : 1920) : weddingRawUrl(id), { timeoutMs: 30_000, headers: { Accept: "image/jpeg,image/*,video/*,audio/*" } });
    if (!r.ok) throw new HttpError(404, "WeddingApp couldn't serve this file.", "media_missing");
    return { response: r, mime: r.headers.get("content-type") || media.mime };
  }
  throw new HttpError(404, "Unknown media store.");
}

// ── Sources ────────────────────────────────────────────────────────────────

type PreviewItem = {
  source: MemorySource; sourceRecordId: string; title: string; date: string | null; mediaType: MediaType;
  visibility: "shareable" | "restricted"; reason?: string; imported: boolean; group?: string;
};

async function importedIds(source: MemorySource, ids: string[]): Promise<Set<string>> {
  const out = new Set<string>();
  const refs = ids.map((id) => adminDb().collection(MEMORIES).doc(importDocId(source, id)));
  for (let i = 0; i < refs.length; i += 100) {
    const snaps = await adminDb().getAll(...refs.slice(i, i + 100));
    snaps.forEach((s, k) => { if (s.exists) out.add(ids[i + k]); });
  }
  return out;
}

export async function sourcesStatus(member: Member) {
  const [linked, wedding, savestate, books, letters, timeline] = await Promise.all([
    hasSaveState(member.uid),
    weddingHealth(),
    ss.health(),
    adminDb().collection("memory_book").count().get().then((c) => c.data().count).catch(() => null),
    adminDb().collection("letters").where("isPublished", "==", true).count().get().then((c) => c.data().count).catch(() => null),
    adminDb().collection("timeline_moments").count().get().then((c) => c.data().count).catch(() => null),
  ]);
  const disconnected = (await adminDb().collection("integration_links").doc(`weddingapp_${member.uid}`).get()).get("disconnected") === true;
  return {
    savestate: { linked, reachable: savestate.up, detail: savestate.detail },
    weddingapp: { configured: true, reachable: wedding.up, detail: wedding.detail, disconnected },
    memory_book: { count: books },
    letters: { count: letters },
    timeline: { count: timeline },
  };
}

export async function previewSaveState(member: Member, albumId?: string): Promise<{ albums?: any[]; items?: PreviewItem[] }> {
  const token = await saveStateToken(member.uid);
  const own = (await adminDb().collection("integration_config").doc("savestate").get()).get("albumId");
  if (!albumId) {
    const albums = (await ss.listAlbums(token)).filter((a) => a.id !== own);
    return {
      albums: albums.map((a) => ({
        id: a.id, name: a.name, description: a.description ?? "", photoCount: a.photoCount ?? 0,
        visibility: a.hasPin ? "restricted" : "shareable",
        reason: a.hasPin ? "PIN-locked in SaveState, so Cupid treats it as private" : undefined,
      })),
    };
  }
  if (albumId === own) throw new HttpError(400, "That album is Cupid's own storage.");
  const albums = await ss.listAlbums(token);
  const album = albums.find((a) => a.id === albumId);
  if (!album) throw new HttpError(404, "SaveState doesn't have that album.");
  if (album.hasPin) return { items: [] };
  const photos = (await ss.listAlbumPhotos(token, albumId)).filter((p) => /\.(jpe?g|png|webp|gif|heic|mp4|mov|webm)$/i.test(p.filename));
  const ids = photos.map((p) => `${albumId}/${p.id}`);
  const done = await importedIds("savestate", ids);
  return {
    items: photos.map((p, i) => ({
      source: "savestate", sourceRecordId: ids[i], group: album.name,
      title: p.caption || p.originalName?.replace(/\.[^.]+$/, "") || "Photo",
      date: p.uploadedAt?.slice(0, 10) ?? null,
      mediaType: /\.(mp4|mov|webm)$/i.test(p.filename) ? "video" : "photo",
      visibility: "shareable", imported: done.has(ids[i]),
    })),
  };
}

// ── WeddingApp ─────────────────────────────────────────────────────────────
// Its public media API (GET /api/media?visibility=public) only ever lists what
// the couple left public and not hidden, so Cupid needs no WeddingApp secret
// and cannot see anything private. Cupid re-checks the list before serving.
type WeddingItem = {
  id: string; name?: string; mimeType?: string; size?: number; createdAt?: string; visibility?: string; kind?: string;
  caption?: string | null; album?: string | null; hidden?: boolean; source?: string | null; guestName?: string | null; questTag?: string | null;
};
let weddingCache: { at: number; items: WeddingItem[] } | null = null;
const WEDDING_ID = /^[A-Za-z0-9_-]{10,200}$/;
const weddingRawUrl = (id: string) => `${env.weddingUrl}/api/media/${encodeURIComponent(id)}/raw`;
/** WeddingApp's image optimiser: a resized JPEG instead of the ~2 MB original. */
const weddingImageUrl = (id: string, w: number) => `${env.weddingUrl}/_next/image?url=${encodeURIComponent(`/api/media/${id}/raw`)}&w=${w}&q=70`;

export function clearWeddingCache() { weddingCache = null; }

async function weddingPublicItems(): Promise<WeddingItem[]> {
  if (weddingCache && Date.now() - weddingCache.at < 5 * 60_000) return weddingCache.items;
  const items: WeddingItem[] = [];
  let pageToken = "";
  try {
    for (let page = 0; page < 10; page++) {
      const r = await fetchWithTimeout(`${env.weddingUrl}/api/media?visibility=public&limit=200${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`, { timeoutMs: 20_000 });
      if (!r.ok) throw new HttpError(503, `WeddingApp answered ${r.status}.`, "weddingapp_unavailable");
      const b: any = await r.json();
      if (b?.configured === false) throw new HttpError(503, "WeddingApp's photo store isn't configured.", "weddingapp_unavailable");
      items.push(...((b?.items ?? []) as WeddingItem[]));
      if (!b?.nextPageToken) break;
      pageToken = b.nextPageToken;
    }
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(503, "WeddingApp is not reachable right now.", "weddingapp_unavailable");
  }
  // Belt and braces: never trust that a public list contains only public things.
  const safe = items.filter((i) => i && WEDDING_ID.test(String(i.id)) && i.visibility === "public" && !i.hidden);
  weddingCache = { at: Date.now(), items: safe };
  return safe;
}

const weddingItem = async (id: string) => (await weddingPublicItems()).find((i) => i.id === id) ?? null;

async function weddingHealth() {
  try { return { up: true, detail: `${(await weddingPublicItems()).length} public photos and videos` }; }
  catch (e: any) { return { up: false, detail: e?.message ?? "unreachable" }; }
}

const weddingKind = (i: WeddingItem) => (i.kind === "video" ? "video" : i.kind === "audio" ? "voice" : "photo") as "photo" | "video" | "voice";
const weddingTitle = (i: WeddingItem) => (i.caption?.trim() || (i.album ? `Wedding · ${i.album}` : i.guestName ? `From ${i.guestName}` : "A wedding moment")).slice(0, 120);
const weddingGroup = (i: WeddingItem) => i.album || (i.source === "photographer" ? "Photographer" : "Guest camera");

export async function previewWedding(member: Member): Promise<{ items: PreviewItem[] }> {
  const off = (await adminDb().collection("integration_links").doc(`weddingapp_${member.uid}`).get()).get("disconnected") === true;
  if (off) throw new HttpError(409, "WeddingApp is disconnected. Reconnect it to see its photos.", "disconnected");
  const rows = await weddingPublicItems();
  const done = await importedIds("weddingapp", rows.map((r) => r.id));
  return {
    items: rows.map((r) => ({
      source: "weddingapp" as const, sourceRecordId: r.id, group: weddingGroup(r), title: weddingTitle(r),
      date: String(r.createdAt ?? "").slice(0, 10) || null, mediaType: weddingKind(r) as MediaType,
      visibility: "shareable" as const, imported: done.has(r.id),
    })),
  };
}

/** A small data-URL preview for the garden grid. Null when the source can't give one small enough. */
async function thumbnailFrom(fetcher: () => Promise<Response>): Promise<string | null> {
  try {
    const r = await fetcher();
    if (!r.ok) return null;
    const type = (r.headers.get("content-type") ?? "").split(";")[0];
    if (!/^image\/(jpeg|webp|png)$/.test(type)) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    const url = `data:${type};base64,${buf.toString("base64")}`;
    return url.length <= 120_000 ? url : null;
  } catch { return null; }
}

const INTERNAL = { memory_book: "memory_book", letters: "letters", timeline: "timeline_moments" } as const;

export async function previewInternal(member: Member, source: "memory_book" | "letters" | "timeline"): Promise<{ items: PreviewItem[] }> {
  const snap = source === "letters"
    ? await adminDb().collection("letters").where("isPublished", "==", true).limit(300).get()
    : await adminDb().collection(INTERNAL[source]).limit(300).get();
  const ids = snap.docs.map((d) => d.id);
  const done = await importedIds(source, ids);
  return {
    items: snap.docs.map((d) => ({
      source, sourceRecordId: d.id,
      title: String(d.get("title") ?? (source === "letters" ? "A letter" : "A memory")).slice(0, 120),
      date: source === "memory_book" ? (d.get("dateStr") ?? null) : source === "timeline" ? (parseLooseDate(d.get("date"))?.date ?? d.get("date") ?? null) : (d.get("publishDate")?.toDate?.()?.toISOString().slice(0, 10) ?? null),
      mediaType: source === "letters" ? "letter" : "text",
      visibility: "shareable", imported: done.has(d.id),
    })),
  };
}

/** How an entry from Cupid's own older sections becomes a memory. Dates are never invented: unreadable ones are tagged "date unsure". */
export function internalMemoryFields(source: "memory_book" | "letters" | "timeline" | "us_drops", s: DocumentSnapshot, now: string) {
  const raw = source === "memory_book" ? s.get("dateStr") : source === "timeline" ? s.get("date") : source === "us_drops" ? s.get("createdAt")?.toDate?.()?.toISOString().slice(0, 10) : s.get("publishDate")?.toDate?.()?.toISOString().slice(0, 10);
  const parsed = parseLooseDate(raw);
  const created = s.get("createdAt")?.toDate?.()?.toISOString?.().slice(0, 10);
  const body = source === "memory_book" ? s.get("narrative") : source === "us_drops" ? s.get("content") : source === "timeline" ? [s.get("description"), s.get("reflection")].filter(Boolean).join("\n\n") : s.get("content");
  const extraTags = (source === "timeline" || source === "us_drops") && s.get("category") ? [String(s.get("category")).replace(/_/g, " ")] : [];
  const special = source === "timeline" ? ["wedding", "proposal", "anniversary", "first_date", "meeting"].includes(s.get("category")) : source === "memory_book" ? s.get("category") === "wedding" : false;
  return {
    title: String(source === "us_drops" ? (s.get("category") ? `Memory drop · ${s.get("category")}` : "A memory drop") : s.get("title") ?? "A memory").slice(0, 120),
    caption: String(body ?? "").slice(0, 4000),
    memoryDate: parsed?.date ?? (isValidMemoryDate(created) ? created! : now.slice(0, 10)),
    datePrecision: parsed?.precision ?? "day",
    mediaType: source === "letters" ? "letter" : "text",
    media: [],
    tags: normaliseTags([...(s.get("tags") ?? []), ...extraTags, ...(parsed ? [] : ["date unsure"])]),
    isSpecialOccasion: special,
    provenanceLabel: source === "letters" ? "Our Love · letters" : source === "timeline" ? "Our Story timeline" : source === "us_drops" ? "Memory Drops" : "Our Memory Book",
  };
}

/** Imports the records the member picked. Restricted ones are refused one by one; the rest go in. */
export async function importRecords(member: Member, body: Record<string, any>) {
  const source = body.source as MemorySource;
  const visibility = visibilityOf(body.visibility);
  const ids: string[] = Array.isArray(body.ids) ? body.ids.filter((x: unknown) => typeof x === "string").slice(0, 50) : [];
  if (!ids.length) throw new HttpError(400, "Pick at least one item to import.");

  const result = { imported: 0, skipped: 0, refused: [] as Array<{ id: string; reason: string }> };
  const now = new Date().toISOString();
  const write = async (sourceRecordId: string, doc: Record<string, any>) => {
    const ref = adminDb().collection(MEMORIES).doc(importDocId(source, sourceRecordId));
    try {
      await ref.create({
        ownerId: member.uid, visibility, collectionIds: [], favouritedBy: [], isSpecialOccasion: false,
        status: "inbox", source, sourceRecordId, lastOpenedAt: null, location: null, thumbnail: null, tags: [],
        provenance: { label: doc.provenanceLabel, importedBy: member.uid, importedAt: now },
        createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
        ...Object.fromEntries(Object.entries(doc).filter(([k]) => k !== "provenanceLabel")),
      });
      result.imported++;
    } catch (e: any) {
      if (e?.code === 6 || /already exists/i.test(e?.message ?? "")) result.skipped++;
      else throw e;
    }
  };

  if (source === "savestate") {
    const token = await saveStateToken(member.uid);
    const albums = await ss.listAlbums(token);
    const own = (await adminDb().collection("integration_config").doc("savestate").get()).get("albumId");
    const photosByAlbum = new Map<string, ss.SaveStatePhoto[]>();
    for (const id of ids) {
      const [albumId, photoId] = id.split("/");
      const album = albums.find((a) => a.id === albumId);
      if (!album || album.id === own) { result.refused.push({ id, reason: "album not available" }); continue; }
      if (album.hasPin) { result.refused.push({ id, reason: "PIN-locked album (private)" }); continue; }
      if (!photosByAlbum.has(albumId)) photosByAlbum.set(albumId, await ss.listAlbumPhotos(token, albumId));
      const p = photosByAlbum.get(albumId)!.find((x) => x.id === photoId);
      if (!p) { result.refused.push({ id, reason: "photo no longer in SaveState" }); continue; }
      const isVideo = /\.(mp4|mov|webm)$/i.test(p.filename);
      const thumbnail = isVideo ? null : await thumbnailFrom(() => ss.photoFile({ token, albumId, filename: p.filename, w: 420 }));
      await write(id, {
        thumbnail,
        title: (p.caption || p.originalName?.replace(/\.[^.]+$/, "") || "Photo").slice(0, 120), caption: "",
        memoryDate: isValidMemoryDate(p.uploadedAt?.slice(0, 10)) ? p.uploadedAt!.slice(0, 10) : now.slice(0, 10),
        datePrecision: "day", mediaType: isVideo ? "video" : "photo",
        media: [{ store: "savestate", kind: isVideo ? "video" : "photo", mime: isVideo ? "video/mp4" : "image/jpeg", size: p.size ?? null, ref: { albumId, photoId: p.id, filename: p.filename } }],
        provenanceLabel: `SaveState · ${album.name}`,
      });
    }
  } else if (source === "weddingapp") {
    const off = (await adminDb().collection("integration_links").doc(`weddingapp_${member.uid}`).get()).get("disconnected") === true;
    if (off) throw new HttpError(409, "WeddingApp is disconnected. Reconnect it first.", "disconnected");
    for (const id of ids) {
      const row = await weddingItem(id);
      if (!row) { result.refused.push({ id, reason: "not public in WeddingApp" }); continue; }
      const kind = weddingKind(row);
      const created = String(row.createdAt ?? "").slice(0, 10);
      const thumbnail = kind === "photo" ? await thumbnailFrom(() => fetchWithTimeout(weddingImageUrl(id, 384), { timeoutMs: 15_000, headers: { Accept: "image/jpeg" } })) : null;
      await write(id, {
        title: weddingTitle(row), caption: row.caption?.trim() ?? "",
        memoryDate: isValidMemoryDate(created) ? created : now.slice(0, 10),
        datePrecision: "day", mediaType: kind, isSpecialOccasion: true, thumbnail,
        // The date is when the file was uploaded, which can be days after the event.
        tags: normaliseTags(["wedding", ...(row.album ? [row.album] : []), row.source === "photographer" ? "photographer" : "guest camera", "upload date"]),
        media: [{ store: "weddingapp", kind, mime: row.mimeType ?? (kind === "photo" ? "image/jpeg" : "video/mp4"), size: row.size ?? null, ref: { rowId: id } }],
        provenanceLabel: `WeddingApp · ${weddingGroup(row)}`,
      });
    }
  } else if (source === "memory_book" || source === "letters" || source === "timeline") {
    const refs = ids.map((id) => adminDb().collection(INTERNAL[source]).doc(id));
    const snaps = await adminDb().getAll(...refs);
    for (const s of snaps) {
      if (!s.exists) { result.refused.push({ id: s.id, reason: "no longer exists" }); continue; }
      if (source === "letters" && s.get("isPublished") !== true) { result.refused.push({ id: s.id, reason: "draft letter" }); continue; }
      await write(s.id, internalMemoryFields(source, s, now));
    }
  } else {
    throw new HttpError(400, "Unknown source.");
  }

  await adminDb().collection("import_history").add({
    at: FieldValue.serverTimestamp(), by: member.uid, source, visibility,
    requested: ids.length, imported: result.imported, skipped: result.skipped, refused: result.refused.length,
  });
  void logEvent({ kind: "import", actor: sideOf(member.role), summary: `${source}: ${result.imported} imported, ${result.skipped} already there, ${result.refused.length} refused` });
  return result;
}

/** Stops a source and (optionally) removes this member's imported references. The source itself is never touched. */
export async function disconnectSource(member: Member, source: MemorySource, removeImported: boolean) {
  if (!["weddingapp", "savestate", "memory_book", "letters", "timeline"].includes(source)) throw new HttpError(400, "Unknown source.");
  if (source === "weddingapp") {
    await adminDb().collection("integration_links").doc(`weddingapp_${member.uid}`).set({ disconnected: true, at: FieldValue.serverTimestamp() }, { merge: true });
  }
  let removed = 0;
  if (removeImported) {
    const snap = await adminDb().collection(MEMORIES).where("ownerId", "==", member.uid).where("source", "==", source).get();
    const batch = adminDb().batch();
    snap.docs.forEach((d) => { batch.delete(d.ref); removed++; });
    if (removed) await batch.commit();
  }
  void logEvent({ kind: "import", actor: sideOf(member.role), summary: `${source} disconnected; ${removed} imported references removed` });
  return { removed };
}

export async function reconnectSource(member: Member, source: MemorySource) {
  if (source !== "weddingapp") throw new HttpError(400, "Only WeddingApp is reconnected here; SaveState reconnects by signing in.");
  await adminDb().collection("integration_links").doc(`weddingapp_${member.uid}`).set({ disconnected: false, at: FieldValue.serverTimestamp() }, { merge: true });
}
