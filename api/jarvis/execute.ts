import { executeJarvisTool, DEFAULT_JARVIS_CONFIG, JarvisPermissionConfig } from "../../src/lib/jarvisIntegration";

const ALLOWED_JARVIS_TOOLS = new Set([
  "cupid_get_status",
  "cupid_add_memory",
  "cupid_draft_letter",
  "cupid_add_message_box",
  "cupid_add_appreciation",
  "cupid_add_dream",
  "cupid_add_date_idea",
  "cupid_get_shared_memories"
]);

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  // 1. Extract API key from Authorization header or X-Jarvis-Key
  const authHeader = req.headers["authorization"] || req.headers["x-jarvis-key"];
  const token = authHeader ? authHeader.replace(/^Bearer\s+/i, "").trim() : "";

  const expectedKey = process.env.JARVIS_API_KEY || "cupid_jarvis_live_bridge_key";

  if (!token || token !== expectedKey) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized: Missing or invalid Jarvis integration key"
    });
  }

  const { tool, toolName, parameters, params } = req.body ?? {};
  const activeToolName = tool || toolName;
  const activeParams = parameters || params || {};

  if (!activeToolName || typeof activeToolName !== "string") {
    return res.status(400).json({
      success: false,
      error: "Missing required field: tool (or toolName)"
    });
  }

  // 2. Strict Tool Positive-Allowlist: Hard block any tool not in the 8 approved relationship capabilities
  if (!ALLOWED_JARVIS_TOOLS.has(activeToolName)) {
    return res.status(403).json({
      success: false,
      error: `Forbidden: Tool '${activeToolName}' is not in the authorized Project Cupid Jarvis registry. Private health and administrative tools are strictly inaccessible.`
    });
  }

  // 3. Defense-in-Depth Keyword Privacy Wall
  const lowerName = activeToolName.toLowerCase();
  if (
    lowerName.includes("health") ||
    lowerName.includes("period") ||
    lowerName.includes("cycle") ||
    lowerName.includes("symptom") ||
    lowerName.includes("journal_private")
  ) {
    return res.status(403).json({
      success: false,
      error: "Forbidden: Private health data and personal journals are strictly isolated and cannot be queried by Jarvis."
    });
  }

  const liveConfig: JarvisPermissionConfig = {
    ...DEFAULT_JARVIS_CONFIG,
    apiKey: expectedKey
  };

  try {
    const result = await executeJarvisTool(activeToolName, activeParams, token, liveConfig);

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (error: any) {
    console.error(`[Jarvis Execute API Error] ${activeToolName}:`, error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Internal error executing Jarvis tool"
    });
  }
}
