import { Resend } from "resend";
import { createLetterNotificationEmail } from "../src/lib/emailTemplates";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

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
        from: process.env.RESEND_FROM_EMAIL || "Project Cupid <onboarding@resend.dev>",
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
}
