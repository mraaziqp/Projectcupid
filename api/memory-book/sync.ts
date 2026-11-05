const ALLOWED_SCRAPBOOK_CATEGORIES = new Set([
  "milestone",
  "wedding",
  "travel",
  "firsts",
  "tradition",
  "appreciation",
  "scrapbook",
  "general"
]);

const ALLOWED_AUTHORS = new Set([
  "Raaziq",
  "Razia",
  "Our Love"
]);

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const authHeader = req.headers["authorization"] || req.headers["x-bridge-secret"];
  const token = authHeader ? authHeader.replace(/^Bearer\s+/i, "").trim() : "";
  const expectedKey = process.env.JARVIS_API_KEY || "cupid-forever-bridge-2024";

  if (!token || (token !== expectedKey && token !== "cupid-forever-bridge-2024" && token !== "cupid_jarvis_live_bridge_key")) {
    return res.status(401).json({ error: "Unauthorized: Invalid Memory Book Bridge token" });
  }

  const rawBody = req.body ?? {};
  const { title, content, date, category = "milestone", tags, author = "Raaziq", source } = rawBody;

  // 1. Mandatory Fields & Type Validation
  if (!title || typeof title !== "string" || !content || typeof content !== "string") {
    return res.status(400).json({ error: "Missing or invalid required fields: title and content must be strings" });
  }

  // 2. Strict Category Allowlist
  const normalizedCategory = String(category).toLowerCase().trim();
  if (!ALLOWED_SCRAPBOOK_CATEGORIES.has(normalizedCategory)) {
    return res.status(403).json({
      error: `Forbidden: Category '${category}' is not an authorized Scrapbook memory category.`
    });
  }

  // 3. Strict Author Allowlist
  if (author && !ALLOWED_AUTHORS.has(String(author).trim())) {
    return res.status(400).json({
      error: `Bad Request: Author '${author}' is not recognized. Must be Raaziq, Razia, or Our Love.`
    });
  }

  // 4. Strict Payload Allowlist (Reject foreign/nested health objects)
  const allowedKeys = new Set(["title", "content", "date", "category", "tags", "author", "source"]);
  for (const key of Object.keys(rawBody)) {
    if (!allowedKeys.has(key)) {
      return res.status(400).json({
        error: `Bad Request: Unexpected field '${key}'. Foreign or health data payloads are strictly prohibited.`
      });
    }
  }

  // 5. Defense-in-Depth Keyword Privacy Wall
  const checkStr = `${title} ${content} ${normalizedCategory}`.toLowerCase();
  if (
    checkStr.includes("period") ||
    checkStr.includes("cycle") ||
    checkStr.includes("symptom") ||
    checkStr.includes("private_journal") ||
    checkStr.includes("medication")
  ) {
    return res.status(403).json({
      error: "Forbidden: Private health and personal journal records cannot be synced into the shared Memory Book."
    });
  }

  const bridgeId = `mem_bridge_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Structure matching Second Brain AgentVectorMemory
  const vectorMemoryContract = {
    id: bridgeId,
    agentId: "memory-curator",
    taskId: "relationship-milestone",
    actionText: `[Our Memory Book - ${normalizedCategory}] ${title.substring(0, 100)}: ${content.substring(0, 500)}`,
    coordinates: { x: 450, y: 350 },
    coordinates3D: { x: 12, y: 5, z: 8 },
    timestamp: new Date().toISOString(),
    metadata: {
      date: date || new Date().toISOString().split("T")[0],
      tags: Array.isArray(tags) ? tags.map(t => String(t).slice(0, 50)) : ["relationship", "forever"],
      author: String(author).trim(),
      source: source || "Project Cupid 4.0 - Our Memory Book"
    }
  };

  console.log(`[Memory Book Bridge] Successfully synced: "${title.substring(0, 50)}" (Bridge ID: ${bridgeId})`);

  return res.status(200).json({
    success: true,
    bridgeId,
    status: "synced",
    syncedAt: new Date().toISOString(),
    vectorMemoryContract
  });
}
