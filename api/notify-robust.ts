import * as admin from "firebase-admin";
import { Resend } from "resend";

// Initialize Firebase Admin once
if (!admin.apps.length) {
  const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountRaw) {
    console.warn("FIREBASE_SERVICE_ACCOUNT not set. FCM notifications disabled.");
  } else {
    try {
      const serviceAccount = JSON.parse(serviceAccountRaw);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } catch (error) {
      console.error("Failed to initialize Firebase Admin:", error);
    }
  }
}

const resend = new Resend(process.env.RESEND_API_KEY);

interface NotifyRequest {
  token?: string;
  email?: string;
  title: string;
  body: string;
  recipientName?: string;
}

/**
 * Bulletproof notification delivery:
 * 1. Try FCM push notification
 * 2. Fall back to email via Resend
 * 3. Log all attempts
 * Returns success if either channel succeeds
 */
export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { token, email, title, body, recipientName = "Love" }: NotifyRequest = req.body ?? {};

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
  if (token && admin.apps.length > 0) {
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

  // Attempt 2: Email Fallback via Resend
  if (email && process.env.RESEND_API_KEY) {
    try {
      const htmlBody = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #db2777 0%, #9f1239 100%); padding: 30px; border-radius: 12px; color: white; text-align: center; margin-bottom: 20px;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 600;">💌 ${title}</h1>
          </div>
          <div style="padding: 20px; background: #f9fafb; border-radius: 8px; color: #1f2937;">
            <p style="font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">${body}</p>
            <p style="font-size: 14px; color: #6b7280; margin: 0;">
              ${recipientName}, open the app to see the full message.
            </p>
          </div>
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px;">
            <p style="margin: 0;">Project Cupid • Secure P2P Encrypted</p>
          </div>
        </div>
      `;

      const response = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "Project Cupid <onboarding@resend.dev>",
        to: email,
        subject: `💝 ${title}`,
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

  return res.status(500).json({
    success: false,
    fcm: { success: fcmSuccess, error: fcmError },
    email: { success: emailSuccess, error: emailError },
    error: "Failed to deliver notification via all channels"
  });
}
