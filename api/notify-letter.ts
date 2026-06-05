import { Resend } from "resend";

function createLetterNotificationEmail(
  letterTitle: string,
  letterContent: string,
  senderName: string,
  recipientName: string
): string {
  const formattedContent = letterContent
    .split('\n')
    .map(line => `<p style="margin: 12px 0; line-height: 1.8; color: #374151;">${line || '&nbsp;'}</p>`)
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">
      <div style="background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); padding: 40px 20px; min-height: 100vh;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); overflow: hidden;">
          <div style="background: linear-gradient(135deg, #db2777 0%, #9f1239 100%); padding: 50px 30px; text-align: center; color: white;">
            <div style="font-size: 48px; margin-bottom: 15px; opacity: 0.9;">💌</div>
            <h1 style="margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">
              ${senderName} sent you a letter
            </h1>
            <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.95; font-weight: 500;">
              A message from your love
            </p>
          </div>
          <div style="padding: 50px 40px;">
            <h2 style="margin: 0 0 30px 0; font-size: 22px; color: #1f2937; font-weight: 600; border-bottom: 3px solid #db2777; padding-bottom: 15px;">
              "${letterTitle}"
            </h2>
            <div style="margin-bottom: 40px; color: #374151;">
              ${formattedContent}
            </div>
            <div style="border-top: 2px solid #e5e7eb; padding-top: 25px; text-align: center;">
              <p style="margin: 0 0 15px 0; color: #db2777; font-size: 16px; font-weight: 600;">
                With love,<br>${senderName}
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                💕 Project Cupid - Your Digital Love Vault
              </p>
            </div>
          </div>
          <div style="padding: 0 40px 40px 40px; text-align: center;">
            <a href="https://projectcupid.vercel.app" style="
              display: inline-block;
              background: linear-gradient(135deg, #db2777 0%, #9f1239 100%);
              color: white;
              padding: 14px 40px;
              border-radius: 8px;
              text-decoration: none;
              font-weight: 600;
              font-size: 14px;
              transition: transform 0.2s;
            ">
              Open the Full Letter →
            </a>
          </div>
          <div style="background: #f9fafb; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 13px;">
              You received this because ${senderName} sent you a letter in Project Cupid
            </p>
            <p style="margin: 0; color: #9ca3af; font-size: 12px;">
              Secure • Encrypted • Private
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

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
        from: process.env.RESEND_FROM_EMAIL || "Project Cupid <cupid@verifiedbizlink.co.za>",
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
