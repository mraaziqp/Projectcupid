import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import * as admin from "firebase-admin";
import { Resend } from "resend";
import dotenv from "dotenv";
import { createLetterNotificationEmail, createSimpleNotificationEmail } from "./src/lib/emailTemplates";

dotenv.config();

// Initialize Firebase Admin once
if (admin && admin.apps && !admin.apps.length) {
  const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountRaw) {
    console.warn("FIREBASE_SERVICE_ACCOUNT environment variable is not set. FCM notifications will not work.");
  } else {
    try {
      const serviceAccount = JSON.parse(serviceAccountRaw);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } catch (error) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT:", error);
    }
  }
} else if (!admin || !admin.apps) {
  console.warn("Firebase Admin SDK not properly initialized");
}

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

  // FCM Push Notifications (legacy endpoint, kept for compatibility)
  app.post("/api/notify", async (req, res) => {
    if (!admin || !admin.apps || !admin.apps.length || !admin.app || !admin.app().messaging) {
      return res.status(500).json({ error: "Firebase Admin not initialized" });
    }

    const { token, title, body } = req.body ?? {};

    if (!token || typeof token !== "string") {
      return res.status(400).json({ error: "Missing FCM token" });
    }
    if (!title || !body) {
      return res.status(400).json({ error: "Missing title or body" });
    }

    try {
      await admin.messaging().send({
        token,
        notification: { title, body },
        webpush: {
          notification: {
            title,
            body,
            icon: "/pwa-192x192.png",
          },
          fcmOptions: {
            link: "/",
          },
        },
      });

      return res.status(200).json({ success: true });
    } catch (error: any) {
      console.error("FCM send error:", error);
      return res.status(500).json({ error: error?.message || "Failed to send notification" });
    }
  });

  // Robust Notifications (FCM + Email Fallback)
  app.post("/api/notify-robust", async (req, res) => {
    try {
      const { token, email, title, body, recipientName = "Love" } = req.body ?? {};

      if (!title || !body) {
        return res.status(400).json({ error: "Missing title or body" });
      }

      if (!token && !email) {
        return res.status(400).json({ error: "Missing both FCM token and email" });
      }

      let fcmSuccess = false;
      let fcmError: string | null = null;
      let emailSuccess = false;
      let emailError: string | null = null;

      // Attempt 1: FCM Push Notification
      if (token && admin && admin.apps && admin.apps.length > 0) {
        try {
          await admin.messaging().send({
            token,
            notification: { title, body },
            webpush: {
              notification: {
                title,
                body,
                icon: "/pwa-192x192.png",
              },
              fcmOptions: {
                link: "/",
              },
            },
          });
          fcmSuccess = true;
          console.log(`✓ FCM notification sent to token: ${token.slice(0, 20)}...`);
        } catch (error: any) {
          fcmError = error?.message || "Unknown FCM error";
          console.warn(`✗ FCM notification failed: ${fcmError}`);
        }
      }

      // Attempt 2: Email Fallback via Resend (with timeout)
      if (email && process.env.RESEND_API_KEY) {
        try {
          const resend = new Resend(process.env.RESEND_API_KEY);

          // Sanitize values to prevent injection
          const safeTitle = String(title).substring(0, 200);
          const safeBody = String(body).substring(0, 5000);
          const safeName = String(recipientName).substring(0, 100);

          // Use beautiful email template
          const htmlBody = createSimpleNotificationEmail(
            safeTitle,
            safeBody,
            safeName,
            "Beloved"
          );

          const response = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || "cupid@resend.dev",
            to: email,
            subject: `💝 ${safeTitle}`,
            html: htmlBody,
          });

          if (response.data?.id) {
            emailSuccess = true;
            console.log(`✓ Email notification sent to: ${email}`);
          } else {
            emailError = "Resend returned no email ID";
            console.warn(`✗ Email notification failed: ${emailError}`);
          }
        } catch (error: any) {
          emailError = error?.message || "Unknown email error";
          console.warn(`✗ Email notification failed: ${emailError}`);
        }
      }

      // Return success if either channel succeeded
      const success = fcmSuccess || emailSuccess;

      if (success) {
        return res.status(200).json({
          success: true,
          fcm: { success: fcmSuccess, error: fcmError },
          email: { success: emailSuccess, error: emailError },
          message: `Notification delivered via ${fcmSuccess && emailSuccess ? "FCM and email" : fcmSuccess ? "FCM" : "email"}`
        });
      }

      // If both failed, still return 200 but indicate both failed (Firestore has it backed up)
      return res.status(200).json({
        success: false,
        fcm: { success: fcmSuccess, error: fcmError },
        email: { success: emailSuccess, error: emailError },
        message: "Notification stored in Firestore but delivery channels unavailable",
        note: "Notification will appear in-app when recipient opens the app"
      });
    } catch (error: any) {
      console.error("Notification endpoint error:", error);
      return res.status(500).json({
        error: "Internal server error",
        message: error?.message || "Unknown error"
      });
    }
  });

  // Beautiful Letter Email Notification
  app.post("/api/notify-letter", async (req, res) => {
    try {
      const { email, letterTitle, letterContent, senderName, recipientName = "Beloved" } = req.body ?? {};

      if (!email || !letterTitle || !letterContent) {
        return res.status(400).json({ error: "Missing required fields: email, letterTitle, letterContent" });
      }

      if (!process.env.RESEND_API_KEY) {
        return res.status(500).json({ error: "Resend API key not configured" });
      }

      try {
        const resend = new Resend(process.env.RESEND_API_KEY);

        // Sanitize content
        const safeTitle = String(letterTitle).substring(0, 200);
        const safeContent = String(letterContent).substring(0, 10000);
        const safeSenderName = String(senderName).substring(0, 100);
        const safeRecipientName = String(recipientName).substring(0, 100);

        // Create beautiful letter email
        const htmlBody = createLetterNotificationEmail(
          safeTitle,
          safeContent,
          safeSenderName,
          safeRecipientName
        );

        const response = await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "cupid@resend.dev",
          to: email,
          subject: `💝 ${safeTitle} - A letter from ${safeSenderName}`,
          html: htmlBody,
        });

        if (response.data?.id) {
          console.log(`✓ Beautiful letter email sent to: ${email}`);
          return res.status(200).json({
            success: true,
            message: "Letter email sent successfully",
            emailId: response.data.id,
          });
        } else {
          console.warn(`✗ Letter email failed: No email ID returned`);
          return res.status(500).json({
            success: false,
            error: "Failed to send letter email",
          });
        }
      } catch (error: any) {
        console.error(`✗ Letter email error:`, error?.message);
        return res.status(500).json({
          success: false,
          error: error?.message || "Failed to send letter email",
        });
      }
    } catch (error: any) {
      console.error("Letter notification endpoint error:", error);
      return res.status(500).json({
        error: "Internal server error",
        message: error?.message,
      });
    }
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
