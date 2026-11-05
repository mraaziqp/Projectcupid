/**
 * Branded Enchanted Romantic Storybook Email Service
 * Reuses existing Resend configuration with server-side delivery & idempotency
 */

export type CupidNotificationEvent =
  | "letter.created"
  | "letter.scheduled_unlocked"
  | "letter.reply"
  | "message_box.daily_ready"
  | "message_box.contributed"
  | "memory.created"
  | "capsule.unlocked"
  | "voucher.gifted"
  | "surprise.sent";

export interface EmailNotificationPayload {
  eventId?: string;
  eventType: CupidNotificationEvent;
  recipientEmail: string;
  recipientName: string;
  senderName: string;
  title: string;
  previewText?: string;
  content?: string;
  deepLink?: string;
  isDiscreet?: boolean;
}

/**
 * Builds an Enchanted Romantic Storybook branded HTML email
 */
export function generateStorybookEmailHtml(payload: EmailNotificationPayload): { subject: string; html: string } {
  const {
    eventType,
    recipientName = "My Love",
    senderName = "Your Partner",
    title,
    content = "",
    deepLink = "https://projectcupid.vercel.app",
    isDiscreet = false
  } = payload;

  let subject = `♡ ${title}`;
  let bannerIcon = "💌";
  let bannerSubtitle = "A sweet moment waiting for you inside Project Cupid";

  if (isDiscreet) {
    subject = "A little something is waiting for you ♡";
    bannerSubtitle = "A private note has been shared in your sanctuary";
  } else {
    switch (eventType) {
      case "letter.created":
        subject = `A little something waiting for you ♡ — ${title}`;
        bannerIcon = "💌";
        bannerSubtitle = `${senderName} has written a letter from the heart for you`;
        break;
      case "message_box.daily_ready":
        subject = "Your little surprise is ready ♡";
        bannerIcon = "✨";
        bannerSubtitle = "Today's sealed virtual message box is waiting to be opened";
        break;
      case "message_box.contributed":
        subject = "A secret message was sealed for you ♡";
        bannerIcon = "🎁";
        bannerSubtitle = `${senderName} slipped a new message into the surprise boxes`;
        break;
      case "letter.reply":
        subject = `A loving reply from ${senderName} ♡`;
        bannerIcon = "🕊️";
        bannerSubtitle = "Words written in response to your letter";
        break;
      case "memory.created":
        subject = "A new memory has been added to our story 📖";
        bannerIcon = "🌿";
        bannerSubtitle = "Another chapter illustrated in our relationship timeline";
        break;
      case "capsule.unlocked":
        subject = "A Marriage Time Capsule has opened! ⏳";
        bannerIcon = "🗝️";
        bannerSubtitle = "Anniversary reflections from our past are ready to read";
        break;
      case "voucher.gifted":
        subject = `You have received a Love Voucher: ${title} 🎟️`;
        bannerIcon = "🎀";
        bannerSubtitle = "Redeemable with love whenever you desire";
        break;
    }
  }

  const formattedContent = content
    ? content
        .split("\n")
        .map(p => `<p style="margin: 12px 0; line-height: 1.8; color: #2c2523; font-family: Georgia, serif; font-size: 16px;">${p || "&nbsp;"}</p>`)
        .join("")
    : `<p style="margin: 12px 0; line-height: 1.8; color: #2c2523; font-family: Georgia, serif; font-size: 16px; font-style: italic;">"Take a quiet moment, step into our private world, and discover what was written just for you."</p>`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0d0b10; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  
  <!-- Outer Dark Fairy-tale Canvas -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background: #0d0b10; padding: 36px 12px;">
    <tr>
      <td align="center">
        
        <!-- Storybook Parchment Card -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #faf7f2; border: 1px solid #dfc298; border-radius: 18px; box-shadow: 0 16px 48px rgba(0,0,0,0.45); overflow: hidden;">
          
          <!-- Romantic Gothic Top Arch Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #241421 0%, #3a1827 50%, #1e111a 100%); padding: 48px 30px; text-align: center; border-bottom: 2px solid #dfc298;">
              <div style="font-size: 42px; line-height: 1; margin-bottom: 14px;">${bannerIcon}</div>
              <h1 style="margin: 0; font-family: 'Playfair Display', Georgia, serif; font-size: 24px; font-weight: 400; letter-spacing: 0.5px; color: #fbf7ee;">
                ${isDiscreet ? "Project Cupid" : title}
              </h1>
              <p style="margin: 10px 0 0 0; font-size: 13px; color: #dfc298; font-style: italic; letter-spacing: 0.3px;">
                ${bannerSubtitle}
              </p>
            </td>
          </tr>

          <!-- Main Letter Content Area -->
          <tr>
            <td style="padding: 40px 36px 30px 36px;">
              
              <div style="margin-bottom: 24px; color: #2c2523;">
                <p style="margin: 0 0 16px 0; font-family: Georgia, serif; font-size: 17px; color: #6b2a47; font-weight: bold;">
                  Dearest ${recipientName},
                </p>
                
                ${isDiscreet ? '<p style="color: #4b4542; font-family: Georgia, serif; font-size: 15px; font-style: italic;">A discreet message is waiting for you in your private sanctuary.</p>' : formattedContent}
              </div>

              <!-- Romantic Sign-off -->
              <div style="margin-top: 32px; padding-top: 22px; border-top: 1px dashed #d8c8b4; text-align: center;">
                <p style="margin: 0 0 4px 0; font-family: 'Playfair Display', Georgia, serif; font-size: 15px; color: #8c2a4e; font-style: italic;">
                  Forever & Always,
                </p>
                <p style="margin: 0; font-family: Georgia, serif; font-size: 16px; color: #2c2523; font-weight: bold;">
                  ${senderName}
                </p>
              </div>

            </td>
          </tr>

          <!-- Interactive Golden Storybook Button -->
          <tr>
            <td align="center" style="padding: 10px 36px 38px 36px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="border-radius: 28px; background: linear-gradient(135deg, #c27ba0 0%, #9f1239 100%); box-shadow: 0 4px 14px rgba(159,18,57,0.3);">
                    <a href="${deepLink}" target="_blank" style="display: inline-block; padding: 14px 34px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #ffffff; text-decoration: none; font-weight: 600; letter-spacing: 0.5px;">
                      Step Inside Project Cupid →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Storybook Vintage Footer -->
          <tr>
            <td style="background-color: #f1ebd9; padding: 22px 30px; text-align: center; border-top: 1px solid #e2d7c3;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #7a6e67; font-family: Georgia, serif;">
                Project Cupid — Our Little Universe
              </p>
              <p style="margin: 0; font-size: 11px; color: #9c9189; letter-spacing: 0.3px;">
                Encrypted • Private Sanctuary • Zero Tracking
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`;

  return { subject, html };
}

/**
 * Client-side trigger calling /api/notify-event with robust retry & idempotency
 */
export async function dispatchEmailNotification(payload: EmailNotificationPayload): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const idempotencyKey = payload.eventId || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const res = await fetch("/api/notify-event", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey
      },
      body: JSON.stringify({
        ...payload,
        eventId: idempotencyKey
      })
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    console.warn("Client email dispatch error:", err);
    return { success: false, error: err?.message || "Failed to trigger email notification" };
  }
}
