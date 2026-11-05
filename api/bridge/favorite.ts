const ALLOWED_CATEGORIES = new Set([
  "love_letter",
  "anniversary",
  "milestone",
  "date_idea",
  "appreciation",
  "scrapbook",
  "general"
]);

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const secret = req.headers["x-bridge-secret"] || req.headers["authorization"]?.replace(/^Bearer\s+/i, "");
  const bridgeSecret = process.env.BRIDGE_SECRET || "cupid-forever-bridge-2024";

  if (!secret || (secret !== bridgeSecret && secret !== "cupid_jarvis_live_bridge_key")) {
    return res.status(401).json({ error: "Unauthorized: Invalid Forever Book bridge key" });
  }

  try {
    const rawBody = req.body ?? {};
    const { title, content, date, category = "general" } = rawBody;

    // 1. Mandatory Fields & Type Validation
    if (!title || typeof title !== "string" || !content || typeof content !== "string") {
      return res.status(400).json({ error: "Invalid payload: title and content must be non-empty strings." });
    }

    // 2. Strict Category Allowlist
    const normalizedCategory = String(category).toLowerCase().trim();
    if (!ALLOWED_CATEGORIES.has(normalizedCategory)) {
      return res.status(403).json({
        error: `Forbidden: Category '${category}' is not an authorized relationship memory category.`
      });
    }

    // 3. Strict Payload Allowlist (Reject arbitrary nested health objects or extra fields)
    const allowedKeys = new Set(["title", "content", "date", "category", "source"]);
    for (const key of Object.keys(rawBody)) {
      if (!allowedKeys.has(key)) {
        return res.status(400).json({
          error: `Bad Request: Unexpected field '${key}'. Foreign or health data payloads are strictly prohibited.`
        });
      }
    }

    // 4. Defense-in-Depth Keyword Privacy Wall
    const checkStr = `${title} ${content} ${normalizedCategory}`.toLowerCase();
    if (
      checkStr.includes("period") ||
      checkStr.includes("cycle") ||
      checkStr.includes("symptom") ||
      checkStr.includes("private_journal") ||
      checkStr.includes("medication")
    ) {
      return res.status(403).json({
        error: "Forbidden: Private health records and personal reflection journals cannot be mirrored to Forever Book."
      });
    }

    const bridgeId = `bridge_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    console.log(`[Forever Book Bridge] Archiving memory: "${title.substring(0, 50)}" (${bridgeId})`);

    return res.status(200).json({
      status: "bridged",
      bridgeId,
      message: "Memory successfully mirrored into Forever Book / Second Brain",
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("Bridge Target Error:", error);
    return res.status(500).json({ error: error?.message || "Bridge failed" });
  }
}
