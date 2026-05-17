import * as admin from "firebase-admin";

// Initialize Firebase Admin once
if (!admin.apps.length) {
  const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountRaw) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT environment variable is not set.");
  }
  const serviceAccount = JSON.parse(serviceAccountRaw);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
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
}
