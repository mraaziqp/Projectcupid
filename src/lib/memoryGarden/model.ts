/**
 * The Memory Garden data model and the pure logic both the app and the server
 * use. No Firebase imports here, so it runs anywhere and is easy to test.
 */

export type Visibility = "shared" | "private";
export type MediaType = "photo" | "video" | "voice" | "letter" | "text" | "booklet";
export type MemorySource = "cupid" | "savestate" | "weddingapp" | "memory_book" | "letters" | "timeline" | "us_drops" | "jarvis";
export type MemoryStatus = "inbox" | "organised" | "archived";
export type DatePrecision = "day" | "month" | "year";

export const MEMORY_SOURCES: MemorySource[] = ["cupid", "savestate", "weddingapp", "memory_book", "letters", "timeline", "us_drops", "jarvis"];
export const MEDIA_TYPES: MediaType[] = ["photo", "video", "voice", "letter", "text", "booklet"];

export interface MediaRef {
  /** Where the bytes live. Cupid keeps a reference, never a second copy. */
  store: "savestate" | "weddingapp";
  kind: "photo" | "video" | "voice";
  mime: string;
  size?: number;
  /** savestate: albumId + photoId + filename. weddingapp: the media row id. */
  ref: { albumId?: string; photoId?: string; filename?: string; rowId?: string };
}

export interface Memory {
  id: string;
  ownerId: string;
  visibility: Visibility;
  title: string;
  caption: string;
  /** YYYY-MM-DD; with `datePrecision` month/year the smaller parts are 01. */
  memoryDate: string;
  datePrecision: DatePrecision;
  mediaType: MediaType;
  media: MediaRef[];
  /** Small JPEG data URL so the garden renders without fetching full images. */
  thumbnail?: string | null;
  tags: string[];
  location?: string | null;
  collectionIds: string[];
  favouritedBy: string[];
  isSpecialOccasion: boolean;
  status: MemoryStatus;
  source: MemorySource;
  sourceRecordId?: string | null;
  provenance?: { label: string; importedBy?: string; importedAt?: string } | null;
  lastOpenedAt?: number | null;
  createdAt?: any;
  updatedAt?: any;
}

export const isEligibleForDaily = (m: Pick<Memory, "visibility" | "status">) => m.visibility === "shared" && m.status !== "archived";

// ── Deterministic choice ───────────────────────────────────────────────────

/** FNV-1a, 32-bit. Stable across runtimes, which is the whole point. */
export function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export type DailyCategory = "on_this_day" | "adventure" | "first" | "ordinary" | "old_favourite" | "unopened";

export const DAILY_LABELS: Record<DailyCategory, string> = {
  on_this_day: "On this day",
  adventure: "A random adventure",
  first: "One of our firsts",
  ordinary: "A little ordinary moment",
  old_favourite: "An old favourite",
  unopened: "A memory we haven't opened in a while",
};

const ROTATION: DailyCategory[] = ["adventure", "first", "ordinary", "old_favourite", "unopened"];
const hasTag = (m: Memory, ...tags: string[]) => m.tags.some((t) => tags.includes(t.toLowerCase()));
const daysBetween = (a: string, b: string) => Math.round((Date.parse(a) - Date.parse(b)) / 86_400_000);

function pool(category: DailyCategory, list: Memory[], date: string): Memory[] {
  const md = date.slice(5);
  switch (category) {
    case "on_this_day":
      return list.filter((m) => m.datePrecision === "day" && m.memoryDate.slice(5) === md && m.memoryDate < date);
    case "first":
      return list.filter((m) => hasTag(m, "first", "firsts", "our firsts"));
    case "ordinary":
      return list.filter((m) => hasTag(m, "ordinary", "everyday", "little moment") || (!m.isSpecialOccasion && m.mediaType !== "letter"));
    case "old_favourite":
      return list.filter((m) => m.favouritedBy.length > 0 && daysBetween(date, m.memoryDate) > 180);
    case "unopened": {
      const sorted = [...list].sort((a, b) => (a.lastOpenedAt ?? 0) - (b.lastOpenedAt ?? 0));
      return sorted.slice(0, Math.max(3, Math.ceil(sorted.length / 4)));
    }
    case "adventure":
    default:
      return list;
  }
}

/**
 * Today's memory. The same for both of you all day, whatever you refresh;
 * `skip` is how many times you pressed "show me another". Memories shown in
 * the last few days are left out when there is anything else to show.
 */
export function pickDailyMemory(
  memories: Memory[],
  opts: { date: string; skip?: number; recentIds?: string[] },
): { memory: Memory; category: DailyCategory } | null {
  const eligible = memories.filter(isEligibleForDaily).sort((a, b) => (a.id < b.id ? -1 : 1));
  if (!eligible.length) return null;
  const recent = new Set(opts.recentIds ?? []);
  const fresh = eligible.filter((m) => !recent.has(m.id));
  const base = fresh.length ? fresh : eligible;
  const skip = Math.max(0, opts.skip ?? 0);

  const order: DailyCategory[] = [];
  if (pool("on_this_day", base, opts.date).length) order.push("on_this_day");
  const start = hash32(`rotation:${opts.date}`) % ROTATION.length;
  for (let i = 0; i < ROTATION.length; i++) order.push(ROTATION[(start + i) % ROTATION.length]);

  // Each skip moves along the categories, then wraps within them.
  const candidates: Array<{ memory: Memory; category: DailyCategory }> = [];
  for (const c of order) {
    const p = pool(c, base, opts.date);
    if (!p.length) continue;
    const ranked = [...p].sort((a, b) => hash32(`${opts.date}:${c}:${a.id}`) - hash32(`${opts.date}:${c}:${b.id}`));
    for (const m of ranked) if (!candidates.some((x) => x.memory.id === m.id)) candidates.push({ memory: m, category: c });
  }
  // A category's first pick leads; the rest follow in order.
  const leaders = order.map((c) => candidates.find((x) => x.category === c)).filter(Boolean) as typeof candidates;
  const rest = candidates.filter((x) => !leaders.includes(x));
  const sequence = [...leaders, ...rest];
  return sequence[skip % sequence.length] ?? null;
}

/** Older shared memories worth rediscovering, a few at a time, stable per week. */
export function forgottenTreasures(memories: Memory[], opts: { date: string; count?: number }): Memory[] {
  const week = Math.floor(Date.parse(opts.date) / (7 * 86_400_000));
  const now = Date.parse(opts.date);
  const old = memories.filter(
    (m) => isEligibleForDaily(m) && (daysBetween(opts.date, m.memoryDate) >= 365 || (m.lastOpenedAt ?? 0) < now - 90 * 86_400_000),
  );
  return [...old].sort((a, b) => hash32(`${week}:${a.id}`) - hash32(`${week}:${b.id}`)).slice(0, opts.count ?? 3);
}

// ── Uploads ────────────────────────────────────────────────────────────────

export const UPLOAD_RULES = {
  photo: { maxBytes: 3 * 1024 * 1024, mimes: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic"] },
  video: { maxBytes: 3 * 1024 * 1024, mimes: ["video/mp4", "video/quicktime", "video/webm"] },
  voice: { maxBytes: 3 * 1024 * 1024, mimes: ["audio/webm", "audio/ogg", "audio/mpeg", "audio/mp4", "audio/wav", "audio/aac"] },
} as const;
export type UploadKind = keyof typeof UPLOAD_RULES;

/**
 * What the bytes actually are, from their first bytes — the browser's MIME
 * type and the file name are only a claim.
 */
export function sniffMime(b: Uint8Array): string | null {
  const at = (i: number, ...v: number[]) => v.every((x, k) => b[i + k] === x);
  const ascii = (i: number, s: string) => [...s].every((ch, k) => b[i + k] === ch.charCodeAt(0));
  if (b.length < 12) return null;
  if (at(0, 0xff, 0xd8, 0xff)) return "image/jpeg";
  if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (ascii(0, "GIF87a") || ascii(0, "GIF89a")) return "image/gif";
  if (ascii(0, "RIFF") && ascii(8, "WEBP")) return "image/webp";
  if (ascii(0, "RIFF") && ascii(8, "WAVE")) return "audio/wav";
  if (ascii(0, "OggS")) return "audio/ogg";
  if (ascii(0, "ID3") || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0 && (b[1] & 0x06) !== 0)) return "audio/mpeg";
  if (b[0] === 0xff && (b[1] & 0xf6) === 0xf0) return "audio/aac";
  if (at(0, 0x1a, 0x45, 0xdf, 0xa3)) return "video/webm"; // also audio/webm: decided by the claimed kind
  if (ascii(4, "ftyp")) {
    const brand = String.fromCharCode(b[8], b[9], b[10], b[11]);
    if (/^(heic|heix|hevc|mif1|msf1)$/.test(brand)) return "image/heic";
    if (/^(M4A |M4B )$/.test(brand)) return "audio/mp4";
    if (brand === "qt  ") return "video/quicktime";
    return "video/mp4";
  }
  return null;
}

export function validateUpload(kind: UploadKind, bytes: Uint8Array): { ok: boolean; mime?: string; error?: string } {
  const rule = UPLOAD_RULES[kind];
  if (!rule) return { ok: false, error: "Unknown media type." };
  if (!bytes.length) return { ok: false, error: "The file is empty." };
  if (bytes.length > rule.maxBytes) return { ok: false, error: `That file is ${(bytes.length / 1048576).toFixed(1)} MB; the limit is ${rule.maxBytes / 1048576} MB.` };
  let mime = sniffMime(bytes);
  if (mime === "video/webm" && kind === "voice") mime = "audio/webm";
  if (mime === "video/mp4" && kind === "voice") mime = "audio/mp4";
  if (!mime || !(rule.mimes as readonly string[]).includes(mime)) {
    return { ok: false, error: `That doesn't look like a supported ${kind} file.` };
  }
  return { ok: true, mime };
}

export const EXT: Record<string, string> = {
  "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif", "image/heic": ".heic",
  "video/mp4": ".mp4", "video/quicktime": ".mov", "video/webm": ".webm",
  "audio/webm": ".webm", "audio/ogg": ".ogg", "audio/mpeg": ".mp3", "audio/mp4": ".m4a", "audio/wav": ".wav", "audio/aac": ".aac",
};

export function normaliseTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out = new Set<string>();
  for (const t of raw) {
    if (typeof t !== "string") continue;
    const v = t.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 32);
    if (v) out.add(v);
    if (out.size >= 12) break;
  }
  return [...out];
}

/**
 * A date from older free-text fields ("2026-09-06", "6 September 2026", "October 2025", "2024").
 * Returns null rather than guessing when the text isn't a date.
 */
export function parseLooseDate(raw: unknown): { date: string; precision: DatePrecision } | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const t = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return isValidMemoryDate(t.slice(0, 10)) ? { date: t.slice(0, 10), precision: "day" } : null;
  if (/^\d{4}$/.test(t)) return isValidMemoryDate(`${t}-01-01`) ? { date: `${t}-01-01`, precision: "year" } : null;
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const m = t.toLowerCase().match(/^(?:(\d{1,2})(?:st|nd|rd|th)?\s+)?([a-z]+)\.?,?\s+(\d{4})$/);
  if (!m) return null;
  const mi = months.indexOf(m[2].slice(0, 3));
  if (mi < 0) return null;
  const mm = String(mi + 1).padStart(2, "0");
  if (m[1]) {
    const d = `${m[3]}-${mm}-${m[1].padStart(2, "0")}`;
    return isValidMemoryDate(d) ? { date: d, precision: "day" } : null;
  }
  return isValidMemoryDate(`${m[3]}-${mm}-01`) ? { date: `${m[3]}-${mm}-01`, precision: "month" } : null;
}

export function isValidMemoryDate(s: unknown): s is string {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s) || s < "1950-01-01" || s > "2100-12-31") return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** Stable document id for an imported record, so importing twice is a no-op. */
export const importDocId = (source: MemorySource, sourceRecordId: string) =>
  `${source}_${hash32(`${source}:${sourceRecordId}`).toString(36)}_${sourceRecordId.replace(/[^A-Za-z0-9]/g, "").slice(0, 40)}`;
