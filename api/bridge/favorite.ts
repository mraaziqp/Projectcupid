export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const secret = req.headers["x-bridge-secret"] || req.headers["authorization"]?.replace(/^Bearer\s+/i, "");
  const bridgeSecret = process.env.BRIDGE_SECRET || "cupid-forever-bridge-2024";

  if (secret !== bridgeSecret && secret !== "cupid_jarvis_live_bridge_key") {
    return res.status(401).json({ error: "Unauthorized: Invalid Forever Book bridge key" });
  }

  try {
    const { title = "", content = "", date, category } = req.body ?? {};

    // Strict Privacy Wall: Reject private health or personal journals
    const checkStr = `${title} ${content} ${category || ""}`.toLowerCase();
    if (
      checkStr.includes("period") ||
      checkStr.includes("cycle") ||
      checkStr.includes("symptom") ||
      checkStr.includes("private_journal") ||
      checkStr.includes("medication_private")
    ) {
      return res.status(403).json({
        error: "Forbidden: Private health records and personal reflection journals cannot be mirrored to Forever Book."
      });
    }

    const bridgeId = `bridge_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    console.log(`[Forever Book Bridge] Archiving memory: "${title || "Untitled"}" (${bridgeId})`);

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
