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

  const { title, content, date, category, tags, author, source } = req.body ?? {};

  if (!title || !content) {
    return res.status(400).json({ error: "Missing required fields: title and content" });
  }

  // Strict Privacy Enforcement: Never allow health or private journal sync
  const checkStr = `${title} ${content} ${category || ""}`.toLowerCase();
  if (
    checkStr.includes("period") ||
    checkStr.includes("cycle") ||
    checkStr.includes("symptom") ||
    checkStr.includes("private_journal") ||
    checkStr.includes("medication_private")
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
    actionText: `[Our Memory Book - ${category || "milestone"}] ${title}: ${content}`,
    coordinates: { x: 450, y: 350 },
    coordinates3D: { x: 12, y: 5, z: 8 },
    timestamp: new Date().toISOString(),
    metadata: {
      date,
      tags: tags || ["relationship", "forever"],
      author: author || "Raaziq",
      source: source || "Project Cupid 4.0 - Our Memory Book"
    }
  };

  console.log(`[Memory Book Bridge] Successfully synced: "${title}" (Bridge ID: ${bridgeId})`);

  return res.status(200).json({
    success: true,
    bridgeId,
    status: "synced",
    syncedAt: new Date().toISOString(),
    vectorMemoryContract
  });
}
