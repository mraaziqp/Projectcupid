/**
 * The inbound memory bridge: another ecosystem app (Forever Book, Jarvis,
 * Second Brain) adds an entry to Our Memory Book.
 *
 * Before 5.0 both bridge endpoints validated the payload and then stored
 * nothing while answering "synced". Entries are now written to memory_book
 * with their source, and the same externalId twice updates nothing.
 */
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./firebaseAdmin.js";
import { HttpError, onlyKeys, text } from "./http.js";
import { hash32, isValidMemoryDate, normaliseTags } from "../../src/lib/memoryGarden/model.js";
import { logEvent } from "./ecosystem.js";

const CATEGORIES = ["milestone", "wedding", "travel", "tradition", "daily_treasure", "firsts", "appreciation", "scrapbook", "general", "love_letter", "anniversary", "date_idea"];
const AUTHORS = ["Raaziq", "Razia", "Our Love"];
/** Words that mean someone is trying to push health or private-journal data through a shared channel. */
const PRIVATE_MARKERS = /\b(period|menstrua\w*|cycle[_ ]?log|symptom|medication|private[_ ]journal|ovulat\w*|fertility)\b/i;

export async function acceptBridgeEntry(body: Record<string, any>, via: string) {
  onlyKeys(body, ["externalId", "title", "content", "date", "category", "tags", "author", "source", "letterId", "id"]);
  const title = text(body.title, 160, { required: true, field: "title" });
  const content = text(body.content, 8000, { required: true, field: "content" });
  const category = String(body.category ?? "general").toLowerCase().trim();
  if (!CATEGORIES.includes(category)) throw new HttpError(403, `Category '${category}' is not a Memory Book category.`);
  const author = body.author ? String(body.author).trim() : "Our Love";
  if (!AUTHORS.includes(author)) throw new HttpError(400, `Author must be one of ${AUTHORS.join(", ")}.`);
  if (PRIVATE_MARKERS.test(`${title} ${content} ${category}`)) {
    throw new HttpError(403, "Health and private-journal content cannot enter the shared Memory Book.", "private_content");
  }
  const source = text(body.source, 80) || via;
  const externalId = text(body.externalId ?? body.id ?? body.letterId, 200) || `${source}:${hash32(`${title}|${body.date ?? ""}`).toString(36)}`;
  const docId = `bridge_${hash32(`${source}|${externalId}`).toString(36)}`;
  const ref = adminDb().collection("memory_book").doc(docId);

  const dateStr = isValidMemoryDate(String(body.date ?? "").slice(0, 10)) ? String(body.date).slice(0, 10) : new Date().toISOString().slice(0, 10);
  const mapped = ["milestone", "wedding", "travel", "tradition", "daily_treasure"].includes(category) ? category : "milestone";
  try {
    await ref.create({
      id: docId, title, narrative: content, dateStr, category: mapped, tags: normaliseTags(body.tags),
      author, authorId: "bridge", isFavorite: false, syncStatus: "received",
      source, externalId, createdAt: FieldValue.serverTimestamp(),
    });
  } catch (e: any) {
    if (e?.code === 6 || /already exists/i.test(e?.message ?? "")) return { status: "duplicate", id: docId, created: false };
    throw e;
  }
  void logEvent({ kind: "bridge", summary: `memory book entry received from ${source.slice(0, 40)}` });
  return { status: "stored", id: docId, created: true };
}
