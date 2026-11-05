import { JARVIS_CUPID_TOOLS } from "../../src/lib/jarvisIntegration";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const configuredKey = process.env.JARVIS_API_KEY || "cupid_jarvis_live_bridge_key";

  return res.status(200).json({
    status: "healthy",
    application: "Project Cupid",
    version: "4.1.0",
    bridgeVersion: "2.5.0",
    authenticated: true,
    capabilities: JARVIS_CUPID_TOOLS.map(t => t.name),
    endpoints: {
      tools: "/api/jarvis/tools",
      execute: "/api/jarvis/execute",
      health: "/api/jarvis/health",
      notify: "/api/notify-event"
    },
    privacyStatus: {
      strictPrivacyEnforced: true,
      healthDataWalledOff: true,
      privateJournalsWalledOff: true
    },
    timestamp: new Date().toISOString()
  });
}
