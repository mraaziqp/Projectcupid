export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { prompt } = req.body ?? {};

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Missing prompt" });
    }

    const ollamaApiUrl = process.env.OLLAMA_API_URL;
    const ollamaApiKey = process.env.OLLAMA_API_KEY;
    const ollamaModel = process.env.OLLAMA_MODEL || "llama3";

    if (!ollamaApiUrl) {
      return res.status(500).json({ error: "OLLAMA_API_URL is not configured." });
    }

    if (!ollamaApiKey) {
      return res.status(500).json({ error: "OLLAMA_API_KEY is not configured." });
    }

    const upstreamResponse = await fetch(ollamaApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ollamaApiKey}`,
      },
      body: JSON.stringify({
        model: ollamaModel,
        prompt,
        stream: false,
      }),
    });

    if (!upstreamResponse.ok) {
      const errorText = await upstreamResponse.text();
      return res.status(upstreamResponse.status).json({
        error: `Ollama upstream error: ${errorText || upstreamResponse.statusText}`,
      });
    }

    const data = await upstreamResponse.json();
    const responseText =
      data?.response ||
      data?.message?.content ||
      data?.choices?.[0]?.message?.content;

    if (!responseText || typeof responseText !== "string") {
      return res.status(502).json({ error: "Unexpected Ollama response format." });
    }

    return res.status(200).json({ response: responseText });
  } catch (error: any) {
    console.error("Ollama API Error:", error);
    return res.status(500).json({ error: error?.message || "Ollama request failed" });
  }
}