/** Pure Memory Garden logic: daily selection, treasures, upload checks, ids. Run: npm run test:unit */
import { section, test, assert, eq, summary } from "./harness";
import { forgottenTreasures, importDocId, parseLooseDate, normaliseTags, pickDailyMemory, sniffMime, validateUpload, isValidMemoryDate, type Memory } from "../src/lib/memoryGarden/model";
import { FIRESTORE_DATABASE_ID, FIREBASE_PROJECT_ID } from "../lib/server/config";
import appConfig from "../firebase-applet-config.json";

const mem = (id: string, over: Partial<Memory> = {}): Memory => ({
  id, ownerId: "a", visibility: "shared", title: id, caption: "", memoryDate: "2025-03-10", datePrecision: "day", mediaType: "photo",
  media: [], thumbnail: null, tags: [], location: null, collectionIds: [], favouritedBy: [], isSpecialOccasion: false, status: "organised",
  source: "cupid", sourceRecordId: null, provenance: null, lastOpenedAt: null, ...over,
});

const garden = [
  mem("m1"), mem("m2", { tags: ["first"] }), mem("m3", { memoryDate: "2024-11-05" }), mem("m4", { favouritedBy: ["a"], memoryDate: "2023-01-01" }),
  mem("m5", { visibility: "private" }), mem("m6", { status: "archived" }), mem("m7", { isSpecialOccasion: true }), mem("m8", { tags: ["ordinary"] }),
];

(async () => {
  section("Daily memory");
  await test("the same day gives the same memory, every time", () => {
    const a = pickDailyMemory(garden, { date: "2026-03-01" });
    const b = pickDailyMemory([...garden].reverse(), { date: "2026-03-01" });
    eq(a?.memory.id, b?.memory.id);
  });
  await test("private memories are never picked", () => {
    for (let d = 1; d <= 60; d++) for (let skip = 0; skip < 8; skip++) {
      const p = pickDailyMemory(garden, { date: `2026-04-${String((d % 28) + 1).padStart(2, "0")}`, skip });
      assert(p && p.memory.id !== "m5", "private picked");
    }
  });
  await test("archived memories are never picked", () => {
    for (let skip = 0; skip < 20; skip++) assert(pickDailyMemory(garden, { date: "2026-05-05", skip })?.memory.id !== "m6", "archived picked");
  });
  await test("no memories → nothing, without errors", () => eq(pickDailyMemory([], { date: "2026-01-01" }), null));
  await test("only private memories → nothing", () => eq(pickDailyMemory([mem("p", { visibility: "private" })], { date: "2026-01-01" }), null));
  await test("'On this day' wins when a memory shares today's date", () => {
    const p = pickDailyMemory(garden, { date: "2026-11-05" });
    eq(p?.category, "on_this_day"); eq(p?.memory.id, "m3");
  });
  await test("different days give variety", () => {
    const seen = new Set<string>();
    for (let d = 1; d <= 28; d++) seen.add(pickDailyMemory(garden, { date: `2026-02-${String(d).padStart(2, "0")}` })!.memory.id);
    assert(seen.size >= 3, `only ${seen.size} distinct picks in 28 days`);
  });
  await test("recently shown memories are skipped when there are alternatives", () => {
    const first = pickDailyMemory(garden, { date: "2026-06-01" })!.memory.id;
    const next = pickDailyMemory(garden, { date: "2026-06-01", recentIds: [first] })!.memory.id;
    assert(next !== first, "repeated a recent memory");
  });
  await test("…but a single memory is still shown even if recent", () => eq(pickDailyMemory([mem("only")], { date: "2026-06-01", recentIds: ["only"] })?.memory.id, "only"));
  await test("'show me another' changes the memory", () => {
    const a = pickDailyMemory(garden, { date: "2026-07-07", skip: 0 })!.memory.id;
    const b = pickDailyMemory(garden, { date: "2026-07-07", skip: 1 })!.memory.id;
    assert(a !== b, "skip did not change the pick");
  });

  section("Forgotten treasures");
  await test("only old or long-unopened shared memories", () => {
    const t = forgottenTreasures(garden, { date: "2026-03-15", count: 10 });
    assert(t.every((m) => m.visibility === "shared" && m.status !== "archived"), "includes private/archived");
    assert(t.some((m) => m.id === "m4"), "old favourite missing");
  });
  await test("stable within a week", () => eq(forgottenTreasures(garden, { date: "2026-03-16" }).map((m) => m.id), forgottenTreasures(garden, { date: "2026-03-17" }).map((m) => m.id)));

  section("Uploads are judged by their bytes");
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, ...new Array(20).fill(0)]);
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...new Array(20).fill(0)]);
  const webm = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, ...new Array(20).fill(0)]);
  const exe = new Uint8Array([0x4d, 0x5a, ...new Array(30).fill(0)]);
  await test("JPEG and PNG are recognised", () => { eq(sniffMime(jpeg), "image/jpeg"); eq(sniffMime(png), "image/png"); });
  await test("an executable is not an image", () => eq(validateUpload("photo", exe).ok, false));
  await test("WebM counts as audio for a voice note and video for a video", () => { eq(validateUpload("voice", webm).mime, "audio/webm"); eq(validateUpload("video", webm).mime, "video/webm"); });
  await test("an image is not accepted as a voice note", () => eq(validateUpload("voice", jpeg).ok, false));
  await test("empty and oversized files are refused", () => {
    eq(validateUpload("photo", new Uint8Array()).ok, false);
    const big = new Uint8Array(3 * 1024 * 1024 + 1); big.set(jpeg);
    eq(validateUpload("photo", big).ok, false);
  });

  section("Small things");
  await test("import ids are stable and source-specific", () => {
    eq(importDocId("savestate", "alb/p1"), importDocId("savestate", "alb/p1"));
    assert(importDocId("savestate", "x") !== importDocId("weddingapp", "x"), "collision across sources");
  });
  await test("tags are trimmed, lower-cased, de-duplicated and capped", () => eq(normaliseTags([" First ", "first", "BEACH", 3, "x".repeat(50)]), ["first", "beach", "x".repeat(32)]));
  await test("old free-text dates are read without guessing", () => {
    eq(parseLooseDate("2026-09-06"), { date: "2026-09-06", precision: "day" });
    eq(parseLooseDate("6 September 2026"), { date: "2026-09-06", precision: "day" });
    eq(parseLooseDate("October 2025"), { date: "2025-10-01", precision: "month" });
    eq(parseLooseDate("2024"), { date: "2024-01-01", precision: "year" });
    eq(parseLooseDate("the beginning"), null);
    eq(parseLooseDate("31 February 2026"), null);
  });
  await test("dates are validated", () => { eq(isValidMemoryDate("2026-09-06"), true); eq(isValidMemoryDate("6 Sept"), false); eq(isValidMemoryDate("2026-13-45"), false); });
  await test("server and app agree on the Firebase project and named database", () => {
    eq(FIREBASE_PROJECT_ID, appConfig.projectId); eq(FIRESTORE_DATABASE_ID, appConfig.firestoreDatabaseId);
  });

  process.exit(summary("MEMORY GARDEN UNIT TESTS"));
})();
