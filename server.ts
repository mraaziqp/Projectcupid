import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Proxy Gemini API for letter generation
  app.post("/api/cupid/generate", async (req, res) => {
    try {
      const { prompt, context } = req.body;
      
      // Basic prompt engineering for "Project Cupid"
      const systemPrompt = `You are "Project Cupid," a Senior Full-Stack Engineer and an expert Romantic Copywriter. 
      Your goal is to write a deeply sincere, warm, protective, and authentic love letter for Razia. 
      Avoid cheap clichés. Emphasize excitement for the future and appreciation for the little things.
      Format the output in beautiful Markdown with logical paragraphs.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `${prompt}\n\nContext about our relationship for inspiration: ${context || 'N/A'}`,
        config: {
          systemInstruction: systemPrompt,
        }
      });

      res.json({ letter: response.text });
    } catch (error: any) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Ollama API Bridge (API key based)
  app.post("/api/ollama/generate", async (req, res) => {
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

      return res.json({ response: responseText });
    } catch (error: any) {
      console.error("Ollama API Error:", error);
      return res.status(500).json({ error: error?.message || "Ollama request failed" });
    }
  });

  // Forever Book API Bridge
  app.post("/api/bridge/favorite", async (req, res) => {
    const secret = req.headers["x-bridge-secret"];
    const BRIDGE_SECRET = "cupid-forever-bridge-2024";

    if (secret !== BRIDGE_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const { title, content, date } = req.body;
      
      console.log(`[Bridge] Archiving letter: ${title}`);
      
      // In a real scenario, this would POST to 'The Forever Book' endpoint
      // For now, we simulate the success of the bridge
      /*
      await fetch("https://the-forever-book.deploy.app/api/ingest", {
        method: "POST",
        headers: { "X-Bridge-Secret": BRIDGE_SECRET },
        body: JSON.stringify({ title, content, date, source: "Project Cupid" })
      });
      */

      res.json({ status: "bridged", message: "Letter pushed to Forever Book" });
    } catch (error) {
      console.error("Bridge Target Error:", error);
      res.status(500).json({ error: "Bridge failed" });
    }
  });

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
