import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY || "";
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "project-cupid-vercel",
        },
      },
    });

    const { prompt, context } = req.body ?? {};

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Missing prompt" });
    }

    const systemPrompt = `You are "Project Cupid," a Senior Full-Stack Engineer and an expert Romantic Copywriter.
Your goal is to write a deeply sincere, warm, protective, and authentic love letter for Razia.
Avoid cheap cliches. Emphasize excitement for the future and appreciation for the little things.
Format the output in beautiful Markdown with logical paragraphs.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `${prompt}\n\nContext about our relationship for inspiration: ${context || "N/A"}`,
      config: {
        systemInstruction: systemPrompt,
      },
    });

    return res.status(200).json({ letter: response.text });
  } catch (error: any) {
    console.error("Gemini Error:", error);
    return res.status(500).json({ error: error?.message || "Failed to generate letter" });
  }
}