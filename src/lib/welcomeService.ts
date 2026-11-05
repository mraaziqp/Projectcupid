import { format } from "date-fns";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "./firebase";

export interface DailyWelcomeStatus {
  date: string;
  userId: string;
  status: "unseen" | "opened" | "deferred" | "skipped";
  openedAt?: string;
  styleChoice: "antique_envelope" | "keepsake_box" | "vintage_parcel";
}

// Special relationship dates for Raaziq & Razia
// Verified: Wedding date is September 6 (09-06 / 2026-09-06)
export const SPECIAL_RELATIONSHIP_DATES: Array<{
  dateStr: string; // MM-dd format
  title: string;
  style: "keepsake_box" | "antique_envelope";
  customGreeting: string;
}> = [
  {
    dateStr: "09-06",
    title: "Our Wedding Day & Forever Anniversary",
    style: "keepsake_box",
    customGreeting: "Happy Anniversary, my beloved wife. Another year of endless love."
  },
  {
    dateStr: "04-08",
    title: "Our Sacred Beginning & Access Code Day",
    style: "keepsake_box",
    customGreeting: "A day etched into the stars of our universe."
  },
  {
    dateStr: "09-15",
    title: "Razia's Special Day",
    style: "keepsake_box",
    customGreeting: "Happy Birthday to the most beautiful soul in my universe."
  },
  {
    dateStr: "06-20",
    title: "Raaziq's Special Day",
    style: "keepsake_box",
    customGreeting: "Celebrating the love of my life."
  }
];

export const GREETING_VARIATIONS = [
  "Good morning, my love.",
  "There's a little something waiting for you today.",
  "A new little piece of love has been left for you.",
  "A gentle whisper from our story...",
  "Close your eyes, take a breath, and discover today's treasure.",
  "A quiet little gift, tucked away just for you."
];

export function getTodayKey(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function getTodaySpecialOccasion(): { title: string; style: "keepsake_box" | "antique_envelope"; customGreeting: string } | null {
  const monthDay = format(new Date(), "MM-dd");
  const match = SPECIAL_RELATIONSHIP_DATES.find(d => d.dateStr === monthDay);
  return match || null;
}

export function getRandomGreeting(): string {
  const special = getTodaySpecialOccasion();
  if (special) return special.customGreeting;
  const index = Math.floor(Math.random() * GREETING_VARIATIONS.length);
  return GREETING_VARIATIONS[index];
}

export function getDailyWelcomeState(userId: string): DailyWelcomeStatus {
  const today = getTodayKey();
  if (typeof localStorage !== "undefined") {
    const raw = localStorage.getItem(`cupid_welcome_${userId}_${today}`);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        // fallback
      }
    }
  }

  const special = getTodaySpecialOccasion();
  return {
    date: today,
    userId,
    status: "unseen",
    styleChoice: special ? special.style : "antique_envelope"
  };
}

/**
 * Persists welcome state locally and synchronizes across devices via Firestore
 */
export async function setDailyWelcomeState(userId: string, status: DailyWelcomeStatus["status"]): Promise<void> {
  const today = getTodayKey();
  const special = getTodaySpecialOccasion();
  const data: DailyWelcomeStatus = {
    date: today,
    userId,
    status,
    styleChoice: special ? special.style : "antique_envelope",
    ...(status === "opened" ? { openedAt: new Date().toISOString() } : {})
  };

  // 1. Immediate local cache for zero UI lag
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(`cupid_welcome_${userId}_${today}`, JSON.stringify(data));
  }

  // 2. Cloud persistence for cross-device consistency
  try {
    const docRef = doc(db, "daily_welcome_status", `${userId}_${today}`);
    await setDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now()
    }, { merge: true });
  } catch (err) {
    console.warn("[DailyWelcome] Cloud persistence notice (using local offline cache):", err);
  }
}

/**
 * Synchronizes daily welcome state from Firestore (e.g. if opened on phone, laptop reflects it)
 */
export async function syncDailyWelcomeStateFromCloud(userId: string): Promise<DailyWelcomeStatus> {
  const today = getTodayKey();
  try {
    const docRef = doc(db, "daily_welcome_status", `${userId}_${today}`);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const cloudData = snap.data() as DailyWelcomeStatus;
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(`cupid_welcome_${userId}_${today}`, JSON.stringify(cloudData));
      }
      return cloudData;
    }
  } catch (err) {
    console.warn("[DailyWelcome] Cloud sync fallback to local cache:", err);
  }

  return getDailyWelcomeState(userId);
}

export function isWelcomeConfigEnabled(): boolean {
  if (typeof localStorage === "undefined") return true;
  const val = localStorage.getItem("cupid_welcome_auto_enabled");
  return val === null ? true : val === "true";
}

export function setWelcomeConfigEnabled(enabled: boolean): void {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("cupid_welcome_auto_enabled", enabled ? "true" : "false");
  }
}
