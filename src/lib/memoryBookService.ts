/**
 * Our Memory Book (the scrapbook). Entries live in Firestore `memory_book`.
 *
 * 5.0: the hard-coded "initial" memories are gone — they were invented
 * events shown as if they had happened, and marked "synced" though nothing
 * had been synced. Saves that fail now say so. "Keep Forever" shares the
 * entry with Jarvis (Second Brain) through the server and records when.
 */
import { collection, doc, getDocs, setDoc, query, orderBy, Timestamp } from "firebase/firestore";
import { db } from "./firebase";
import { apiFetch } from "./api";

export type MemorySyncStatus = "synced" | "pending" | "synchronizing" | "local_only" | "failed" | "requires_attention" | "received";

export interface MemoryBookItem {
  id: string;
  title: string;
  narrative: string;
  dateStr: string;
  photoUrl?: string;
  category: "wedding" | "milestone" | "travel" | "tradition" | "daily_treasure";
  tags: string[];
  author: string;
  authorId: string;
  isFavorite: boolean;
  syncStatus: MemorySyncStatus;
  syncedAt?: string;
  externalBridgeId?: string;
  source?: string;
  createdAt: any;
}

export async function getScrapbookMemories(): Promise<MemoryBookItem[]> {
  const snap = await getDocs(query(collection(db, "memory_book"), orderBy("dateStr", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as MemoryBookItem);
}

export async function addScrapbookMemory(memory: Omit<MemoryBookItem, "id" | "createdAt" | "syncStatus">): Promise<MemoryBookItem> {
  const existing = await getScrapbookMemories();
  const duplicate = existing.find((m) => m.title.trim().toLowerCase() === memory.title.trim().toLowerCase() && m.dateStr === memory.dateStr);
  if (duplicate) return duplicate;

  const ref = doc(collection(db, "memory_book"));
  const entry: MemoryBookItem = { ...memory, id: ref.id, syncStatus: "local_only", createdAt: Timestamp.now() };
  await setDoc(ref, entry);
  return entry;
}

/** Shares the entry with Jarvis as searchable knowledge. */
export async function syncMemoryToEcosystem(memory: MemoryBookItem): Promise<{ success: boolean; bridgeId?: string; error?: string }> {
  try {
    const r = await apiFetch<{ ok: boolean; syncedAt: string }>("memory-book/share-with-jarvis", { body: { id: memory.id } });
    return { success: r.ok, bridgeId: `jarvis:${memory.id}` };
  } catch (e: any) {
    return { success: false, error: e?.message ?? "Could not reach Jarvis" };
  }
}
