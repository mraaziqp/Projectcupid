import { Resend } from "resend";

let adminModule: any = null;
let firebaseAdminInitialized = false;

async function getAdmin() {
  if (adminModule) return adminModule;
  try {
    // Dynamically import to prevent bundler/import failures at startup
    adminModule = await import("firebase-admin");
    if (adminModule && !adminModule.apps.length) {
      const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
      if (serviceAccountRaw) {
        try {
          const serviceAccount = JSON.parse(serviceAccountRaw);
          adminModule.initializeApp({
            credential: adminModule.credential.cert(serviceAccount),
          });
          firebaseAdminInitialized = true;
        } catch (error) {
          console.error("Failed to initialize Firebase Admin:", error);
        }
      } else {
        console.warn("FIREBASE_SERVICE_ACCOUNT not set. FCM notifications disabled.");
      }
    } else if (adminModule && adminModule.apps.length > 0) {
      firebaseAdminInitialized = true;
    }
  } catch (err) {
    console.warn("firebase-admin module failed to load:", err);
  }
  return adminModule;
}

interface NotifyRequest {
  token?: string;
  email?: string;
  title: string;
  body: string;
  recipientName?: string;
  senderName?: string;
  theme?: "nudge" | "feeling" | "general";
}

function createCuteNotificationEmail(
  title: string,
  body: string,
  senderName: string,
  recipientName: string,
  theme: "nudge" | "feeling" | "general" = "general"
): string {
  const gradient = theme === "nudge"
    ? "linear-gradient(135deg, #f472b6 0%, #db2777 100%)"
    : theme === "feeling"
    ? "linear-gradient(135deg, #c084fc 0%, #7e22ce 100%)"
    : "linear-gradient(135deg, #f43f5e 0%, #be123c 100%)";

  const icon = theme === "nudge" ? "🧸" : theme === "feeling" ? "✨" : "💝";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; background-color: #fff5f5;">
      <div style="background-color: #fff5f5; padding: 40px 20px; min-height: 100vh;">
        <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 20px; box-shadow: 0 10px 30px rgba(219,39,119,0.08); overflow: hidden; border: 1px solid #ffe4e6;">
          <div style="background: ${gradient}; padding: 40px 30px; text-align: center; color: white;">
            <div style="font-size: 54px; margin-bottom: 10px; line-height: 1;">${icon}</div>
            <h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; text-shadow: 0 2px 4px rgba(0,0,0,0.15);">
              ${title}
            </h1>
          </div>
          <div style="padding: 40px 30px; text-align: center; background: #fffdfd;">
            <p style="margin: 0 0 10px 0; color: #e11d48; font-size: 14px; font-weight: 600; text-transform: uppercase; tracking-widest: 0.1em;">
              Dear ${recipientName},
            </p>
            <p style="margin: 0 0 30px 0; color: #4b5563; font-size: 17px; line-height: 1.6; font-style: italic; font-weight: 500;">
              "${body}"
            </p>
            <div style="display: inline-block; padding: 10px 24px; background-color: #fff1f2; border: 1px dashed #fecdd3; border-radius: 30px; margin-bottom: 30px;">
              <span style="color: #db2777; font-size: 13px; font-weight: 600;">
                Sending you lots of love and warmth! 💕
              </span>
            </div>
            <div style="border-top: 1px solid #f3f4f6; padding-top: 25px;">
              <p style="margin: 0 0 5px 0; color: #4b5563; font-size: 13px;">
                With all my heart,
              </p>
              <p style="margin: 0; color: #db2777; font-size: 16px; font-weight: 700;">
                ${senderName}
              </p>
            </div>
          </div>
          <div style="background: #fff8f8; padding: 20px; text-align: center; border-top: 1px solid #ffe4e6;">
            <a href="https://projectcupid.vercel.app" style="color: #be123c; text-decoration: none; font-size: 12px; font-weight: 600;">
              Open Project Cupid →
            </a>
            <p style="margin: 10px 0 0 0; color: #9ca3af; font-size: 10px;">
              💕 Your Private Digital Sanctuary
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
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

  const { token, email, title, body, recipientName = "Love", senderName = "Your Partner", theme = "general" }: NotifyRequest = req.body ?? {};

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

  const admin = await getAdmin();

  // Attempt 1: FCM Push Notification
  if (token && admin && firebaseAdminInitialized) {
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
      const resend = new Resend(process.env.RESEND_API_KEY);
      
      const safeTitle = String(title).substring(0, 200);
      const safeBody = String(body).substring(0, 5000);
      const safeName = String(recipientName).substring(0, 100);
      const safeSender = String(senderName).substring(0, 100);

      const htmlBody = createCuteNotificationEmail(
        safeTitle,
        safeBody,
        safeSender,
        safeName,
        theme
      );

      const response = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "Project Cupid <cupid@verifiedbizlink.co.za>",
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

  return res.status(500).json({
    success: false,
    fcm: { success: fcmSuccess, error: fcmError },
    email: { success: emailSuccess, error: emailError },
    error: "Failed to deliver notification via all channels"
  });
}
