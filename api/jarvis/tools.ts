import { JARVIS_CUPID_TOOLS } from "../../src/lib/jarvisIntegration";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Check optional authorization header
  const authHeader = req.headers["authorization"] || req.headers["x-jarvis-key"];
  const expectedKey = process.env.JARVIS_API_KEY || "cupid_jarvis_live_bridge_key";

  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (token !== expectedKey) {
      return res.status(401).json({ error: "Unauthorized: Invalid Jarvis API key" });
    }
  }

  return res.status(200).json({
    application: "Project Cupid",
    version: "3.0.0",
    description: "Private romantic marriage & women's wellbeing sanctuary",
    ecosystem: "Jarvis Second-Brain v2.5",
    toolsCount: JARVIS_CUPID_TOOLS.length,
    tools: JARVIS_CUPID_TOOLS,
    privacyBoundary: {
      healthDataExposed: false,
      privateJournalsExposed: false,
      guarantee: "Strict user-level isolation. Private health & journals are not accessible programmatically."
    }
  });
}
