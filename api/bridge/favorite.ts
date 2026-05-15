export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const secret = req.headers["x-bridge-secret"];
  const bridgeSecret = process.env.BRIDGE_SECRET || "cupid-forever-bridge-2024";

  if (secret !== bridgeSecret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { title } = req.body ?? {};
    console.log(`[Bridge] Archiving letter: ${title || "Untitled"}`);

    return res.status(200).json({
      status: "bridged",
      message: "Letter pushed to Forever Book",
    });
  } catch (error: any) {
    console.error("Bridge Target Error:", error);
    return res.status(500).json({ error: error?.message || "Bridge failed" });
  }
}