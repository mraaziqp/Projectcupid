import { format } from "date-fns";

export interface DailyWelcomeStatus {
  date: string;
  userId: string;
  status: "unseen" | "opened" | "deferred" | "skipped";
  openedAt?: string;
  styleChoice: "antique_envelope" | "keepsake_box" | "vintage_parcel";
}

// Special dates for Raaziq & Razia
export const SPECIAL_RELATIONSHIP_DATES: Array<{
  dateStr: string; // MM-dd format
  title: string;
  style: "keepsake_box" | "antique_envelope";
  customGreeting: string;
}> = [
  {
    dateStr: "10-25",
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
  const raw = localStorage.getItem(`cupid_welcome_${userId}_${today}`);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      // fallback
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

export function setDailyWelcomeState(userId: string, status: DailyWelcomeStatus["status"]): void {
  const today = getTodayKey();
  const special = getTodaySpecialOccasion();
  const data: DailyWelcomeStatus = {
    date: today,
    userId,
    status,
    openedAt: status === "opened" ? new Date().toISOString() : undefined,
    styleChoice: special ? special.style : "antique_envelope"
  };
  localStorage.setItem(`cupid_welcome_${userId}_${today}`, JSON.stringify(data));
}

export function isWelcomeConfigEnabled(): boolean {
  const val = localStorage.getItem("cupid_welcome_auto_enabled");
  return val === null ? true : val === "true";
}

export function setWelcomeConfigEnabled(enabled: boolean): void {
  localStorage.setItem("cupid_welcome_auto_enabled", enabled ? "true" : "false");
}
