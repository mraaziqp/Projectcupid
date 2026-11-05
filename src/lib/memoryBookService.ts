import { collection, doc, getDocs, setDoc, query, orderBy, Timestamp } from "firebase/firestore";
import { db } from "./firebase";
import { format } from "date-fns";

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
  syncStatus: "synced" | "pending" | "local_only" | "failed";
  syncedAt?: string;
  externalBridgeId?: string;
  createdAt: any;
}

export const INITIAL_SCRAPBOOK_MEMORIES: MemoryBookItem[] = [
  {
    id: "mem_wedding_day",
    title: "Our Sacred Wedding Day",
    narrative: "Surrounded by our families and blessings, we tied our souls together in eternal love. The sweetest day of my entire existence.",
    dateStr: "2025-10-25",
    photoUrl: "/wedding.jpg",
    category: "wedding",
    tags: ["wedding", "forever", "milestone", "sacred"],
    author: "Raaziq",
    authorId: "raaziq",
    isFavorite: true,
    syncStatus: "synced",
    syncedAt: "2025-10-25T18:00:00Z",
    externalBridgeId: "fb_wed_2025",
    createdAt: Timestamp.now()
  },
  {
    id: "mem_first_ramadan",
    title: "Our First Ramadan Together as Husband & Wife",
    narrative: "Waking up before dawn for Suhoor, praying together under the quiet night sky, and breaking fast with pure gratitude.",
    dateStr: "2026-03-10",
    category: "tradition",
    tags: ["ramadan", "prayer", "tradition", "blessed"],
    author: "Razia",
    authorId: "razia",
    isFavorite: true,
    syncStatus: "synced",
    syncedAt: "2026-03-10T20:00:00Z",
    externalBridgeId: "fb_ram_2026",
    createdAt: Timestamp.now()
  },
  {
    id: "mem_quiet_evening",
    title: "The Rainy Evening & Warm Tea",
    narrative: "Rain pouring against the windowpane while we talked about our dreams, laughed until our sides hurt, and realized how peaceful our home is.",
    dateStr: "2026-04-18",
    category: "daily_treasure",
    tags: ["laughter", "home", "peace"],
    author: "Raaziq",
    authorId: "raaziq",
    isFavorite: false,
    syncStatus: "synced",
    createdAt: Timestamp.now()
  }
];

export async function getScrapbookMemories(): Promise<MemoryBookItem[]> {
  try {
    const q = query(collection(db, "memory_book"), orderBy("dateStr", "desc"));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as MemoryBookItem));
    }
  } catch (e) {
    console.warn("Firestore memory book query fallback to initial:", e);
  }

  // Fallback to initial seeded scrapbook
  return INITIAL_SCRAPBOOK_MEMORIES;
}

export async function addScrapbookMemory(memory: Omit<MemoryBookItem, "id" | "createdAt" | "syncStatus">): Promise<MemoryBookItem> {
  const ref = doc(collection(db, "memory_book"));
  const newEntry: MemoryBookItem = {
    ...memory,
    id: ref.id,
    syncStatus: "pending",
    createdAt: Timestamp.now()
  };

  try {
    await setDoc(ref, newEntry);
  } catch (e) {
    console.warn("Could not save memory to Firestore:", e);
  }

  // Attempt ecosystem sync
  syncMemoryToEcosystem(newEntry).catch(e => console.warn("Ecosystem sync error:", e));

  return newEntry;
}

export async function syncMemoryToEcosystem(memory: MemoryBookItem): Promise<{ success: boolean; bridgeId?: string; error?: string }> {
  try {
    const res = await fetch("/api/bridge/favorite", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Bridge-Secret": "cupid-forever-bridge-2024"
      },
      body: JSON.stringify({
        id: memory.id,
        title: memory.title,
        content: memory.narrative,
        date: memory.dateStr,
        category: memory.category,
        tags: memory.tags,
        author: memory.author,
        source: "Project Cupid 4.0 - Our Memory Book"
      })
    });

    const data = await res.json();
    return { success: res.ok, bridgeId: data.bridgeId || `sync_${Date.now()}` };
  } catch (e: any) {
    console.warn("[Memory Book Bridge] Sync error:", e);
    return { success: false, error: e.message };
  }
}
