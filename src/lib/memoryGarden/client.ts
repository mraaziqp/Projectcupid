/**
 * Memory Garden in the app: live data, actions, and preparing media.
 *
 * Reads go straight to Firestore (the rules decide what each person sees).
 * Anything with media, imports and deletes go through the server, which keeps
 * the files in SaveState and checks visibility before serving them.
 */
import { useEffect, useMemo, useState } from "react";
import {
  addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc, getDoc, onSnapshot, query,
  serverTimestamp, setDoc, updateDoc, where,
} from "firebase/firestore";
import { db } from "../firebase";
import { apiFetch } from "../api";
import { normaliseTags, type Memory, type Visibility, type UploadKind } from "./model";

export interface MemoryCollection { id: string; name: string; description?: string; ownerId: string; visibility: Visibility; coverMemoryId?: string | null }
export interface Perspective { id: string; memoryId: string; authorId: string; text: string; shared: boolean }
export interface Reaction { id: string; memoryId: string; userId: string; emoji: string; note?: string | null }

const toMemory = (id: string, d: any): Memory => ({
  id, ownerId: d.ownerId, visibility: d.visibility, title: d.title ?? "", caption: d.caption ?? "",
  memoryDate: d.memoryDate ?? "1970-01-01", datePrecision: d.datePrecision ?? "day", mediaType: d.mediaType ?? "text",
  media: d.media ?? [], thumbnail: d.thumbnail ?? null, tags: d.tags ?? [], location: d.location ?? null,
  collectionIds: d.collectionIds ?? [], favouritedBy: d.favouritedBy ?? [], isSpecialOccasion: !!d.isSpecialOccasion,
  status: d.status ?? "inbox", source: d.source ?? "cupid", sourceRecordId: d.sourceRecordId ?? null,
  provenance: d.provenance ?? null, lastOpenedAt: d.lastOpenedAt ?? null, createdAt: d.createdAt, updatedAt: d.updatedAt,
});

/** Shared memories plus my own private ones, live. */
export function useMemories(uid: string | undefined) {
  const [shared, setShared] = useState<Memory[]>([]);
  const [mine, setMine] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    let pending = 2;
    const done = () => { pending = Math.max(0, pending - 1); if (!pending) setLoading(false); };
    const fail = (e: any) => { console.warn("Memory Garden:", e); setError("Some memories couldn't be loaded. Check your connection."); done(); };
    const a = onSnapshot(query(collection(db, "memories"), where("visibility", "==", "shared")), (s) => { setShared(s.docs.map((d) => toMemory(d.id, d.data()))); done(); }, fail);
    const b = onSnapshot(query(collection(db, "memories"), where("ownerId", "==", uid)), (s) => { setMine(s.docs.map((d) => toMemory(d.id, d.data()))); done(); }, fail);
    return () => { a(); b(); };
  }, [uid]);

  const memories = useMemo(() => {
    const byId = new Map<string, Memory>();
    for (const m of [...shared, ...mine]) byId.set(m.id, m);
    return [...byId.values()].sort((x, y) => (x.memoryDate < y.memoryDate ? 1 : x.memoryDate > y.memoryDate ? -1 : 0));
  }, [shared, mine]);

  return { memories, loading, error };
}

export function useCollections(uid: string | undefined) {
  const [shared, setShared] = useState<MemoryCollection[]>([]);
  const [mine, setMine] = useState<MemoryCollection[]>([]);
  useEffect(() => {
    if (!uid) return;
    const map = (s: any) => s.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    const a = onSnapshot(query(collection(db, "memory_collections"), where("visibility", "==", "shared")), (s) => setShared(map(s)), () => {});
    const b = onSnapshot(query(collection(db, "memory_collections"), where("ownerId", "==", uid)), (s) => setMine(map(s)), () => {});
    return () => { a(); b(); };
  }, [uid]);
  return useMemo(() => {
    const byId = new Map<string, MemoryCollection>();
    for (const c of [...shared, ...mine]) byId.set(c.id, c);
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [shared, mine]);
}

/** My perspective and (if shared) theirs, plus reactions, for one memory. */
export function useMemoryExtras(memoryId: string | null, uid: string | undefined, isShared: boolean) {
  const [perspectives, setPerspectives] = useState<Perspective[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  useEffect(() => {
    if (!memoryId || !uid) return;
    const map = (s: any) => s.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    const subs = [
      onSnapshot(query(collection(db, "memory_perspectives"), where("memoryId", "==", memoryId), where("authorId", "==", uid)), (s) => setPerspectives((p) => [...map(s), ...p.filter((x) => x.authorId !== uid)]), () => {}),
    ];
    if (isShared) {
      subs.push(onSnapshot(query(collection(db, "memory_perspectives"), where("memoryId", "==", memoryId), where("shared", "==", true)), (s) => setPerspectives((p) => [...p.filter((x) => x.authorId === uid), ...map(s).filter((x: Perspective) => x.authorId !== uid)]), () => {}));
      subs.push(onSnapshot(query(collection(db, "memory_reactions"), where("memoryId", "==", memoryId)), (s) => setReactions(map(s)), () => {}));
    }
    return () => subs.forEach((u) => u());
  }, [memoryId, uid, isShared]);
  return { perspectives, reactions };
}

// ── Actions ────────────────────────────────────────────────────────────────

export async function saveMoment(input: {
  title: string; caption: string; memoryDate: string; datePrecision?: "day" | "month" | "year"; visibility: Visibility;
  tags: string[]; location?: string; isSpecialOccasion?: boolean; file?: { kind: UploadKind; data: string } | null; thumbnail?: string | null;
}) {
  return apiFetch<Memory>("memories", {
    body: {
      ...input,
      tags: normaliseTags(input.tags),
      mediaType: input.file ? input.file.kind : "text",
      file: input.file ?? undefined,
      thumbnail: input.thumbnail ?? undefined,
    },
  });
}

export async function addMediaToMemory(memoryId: string, file: { kind: UploadKind; data: string }, thumbnail?: string | null) {
  return apiFetch("memories/media", { body: { memoryId, file, thumbnail: thumbnail ?? undefined } });
}

export async function updateMemory(id: string, changes: Partial<Pick<Memory, "title" | "caption" | "memoryDate" | "datePrecision" | "visibility" | "tags" | "location" | "isSpecialOccasion" | "status" | "collectionIds">>) {
  await updateDoc(doc(db, "memories", id), { ...changes, ...(changes.tags ? { tags: normaliseTags(changes.tags) } : {}), updatedAt: serverTimestamp() });
}

export const deleteMemory = (id: string) => apiFetch("memories/delete", { body: { id } });

export async function toggleFavourite(m: Memory, uid: string) {
  const on = m.favouritedBy.includes(uid);
  await updateDoc(doc(db, "memories", m.id), { favouritedBy: on ? arrayRemove(uid) : arrayUnion(uid), updatedAt: serverTimestamp() });
}

export async function markOpened(m: Memory) {
  if (m.lastOpenedAt && Date.now() - m.lastOpenedAt < 6 * 3600_000) return;
  await updateDoc(doc(db, "memories", m.id), { lastOpenedAt: Date.now() }).catch(() => {});
}

export async function setCollectionMembership(m: Memory, collectionId: string, inIt: boolean) {
  await updateDoc(doc(db, "memories", m.id), { collectionIds: inIt ? arrayUnion(collectionId) : arrayRemove(collectionId), updatedAt: serverTimestamp() });
}

export async function savePerspective(memoryId: string, uid: string, text: string, shared: boolean) {
  await setDoc(doc(db, "memory_perspectives", `${memoryId}_${uid}`), { memoryId, authorId: uid, text: text.slice(0, 4000), shared, updatedAt: serverTimestamp() });
}

export async function react(memoryId: string, uid: string, emoji: string, note?: string) {
  const ref = doc(db, "memory_reactions", `${memoryId}_${uid}`);
  if (!emoji) return deleteDoc(ref);
  await setDoc(ref, { memoryId, userId: uid, emoji, note: note?.trim() ? note.trim().slice(0, 280) : null, at: serverTimestamp() });
}

export async function createCollection(uid: string, name: string, visibility: Visibility, description = "") {
  return addDoc(collection(db, "memory_collections"), { ownerId: uid, name: name.trim().slice(0, 60), description: description.trim().slice(0, 300), visibility, coverMemoryId: null, createdAt: serverTimestamp() });
}
export const renameCollection = (id: string, name: string, description: string) =>
  updateDoc(doc(db, "memory_collections", id), { name: name.trim().slice(0, 60), description: description.trim().slice(0, 300) });
export const removeCollection = (id: string) => deleteDoc(doc(db, "memory_collections", id));

/** Today's pick, remembered per person so "show me another" survives a refresh. */
export async function loadDailyState(uid: string, date: string): Promise<{ skip: number; recentIds: string[] }> {
  const recentIds: string[] = [];
  for (let i = 1; i <= 6; i++) {
    const d = new Date(Date.parse(date) - i * 86_400_000).toISOString().slice(0, 10);
    const s = await getDoc(doc(db, "daily_memory", `${uid}_${d}`)).catch(() => null);
    if (s?.exists() && s.get("memoryId")) recentIds.push(s.get("memoryId"));
  }
  const today = await getDoc(doc(db, "daily_memory", `${uid}_${date}`)).catch(() => null);
  return { skip: today?.exists() ? Number(today.get("skip") ?? 0) : 0, recentIds };
}
export async function saveDailyState(uid: string, date: string, memoryId: string, skip: number) {
  await setDoc(doc(db, "daily_memory", `${uid}_${date}`), { userId: uid, date, memoryId, skip, at: serverTimestamp() }).catch(() => {});
}

// ── Preparing media in the browser ─────────────────────────────────────────

export const readAsDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("That image couldn't be read.")); };
    img.src = url;
  });
}

function drawScaled(src: CanvasImageSource, w: number, h: number, max: number): HTMLCanvasElement {
  const scale = Math.min(1, max / Math.max(w, h));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w * scale));
  c.height = Math.max(1, Math.round(h * scale));
  c.getContext("2d")!.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

const canvasJpeg = (c: HTMLCanvasElement, q: number) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Could not encode image"))), "image/jpeg", q));

/** A photo resized to fit the upload limit, and a small thumbnail for the garden. */
export async function preparePhoto(file: File): Promise<{ data: string; thumbnail: string; bytes: number }> {
  const img = await loadImage(file);
  let max = 2400, q = 0.86, blob: Blob;
  do {
    blob = await canvasJpeg(drawScaled(img, img.naturalWidth, img.naturalHeight, max), q);
    max = Math.round(max * 0.8); q = Math.max(0.6, q - 0.06);
  } while (blob.size > 2.8 * 1024 * 1024 && max > 600);
  const thumb = await canvasJpeg(drawScaled(img, img.naturalWidth, img.naturalHeight, 420), 0.72);
  return { data: await readAsDataUrl(blob), thumbnail: await readAsDataUrl(thumb), bytes: blob.size };
}

/** First frame of a video, as a thumbnail. Resolves null when the browser can't decode it. */
export function videoThumbnail(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.muted = true; v.playsInline = true; v.preload = "metadata"; v.src = url;
    const finish = (r: string | null) => { URL.revokeObjectURL(url); resolve(r); };
    v.onloadeddata = () => { v.currentTime = Math.min(0.5, (v.duration || 1) / 4); };
    v.onseeked = async () => {
      try { finish(await readAsDataUrl(await canvasJpeg(drawScaled(v, v.videoWidth, v.videoHeight, 420), 0.72))); }
      catch { finish(null); }
    };
    v.onerror = () => finish(null);
    setTimeout(() => finish(null), 8000);
  });
}

export const todayLocal = () => new Date().toLocaleDateString("en-CA");
