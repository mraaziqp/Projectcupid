/**
 * Beautiful email templates for Project Cupid notifications
 */

export function createLetterNotificationEmail(
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

      <!-- Outer wrapper with background -->
      <div style="background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); padding: 40px 20px; min-height: 100vh;">

        <!-- Main card container -->
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); overflow: hidden;">

          <!-- Header with gradient -->
          <div style="background: linear-gradient(135deg, #db2777 0%, #9f1239 100%); padding: 50px 30px; text-align: center; color: white;">
            <div style="font-size: 48px; margin-bottom: 15px; opacity: 0.9;">💌</div>
            <h1 style="margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">
              ${senderName} sent you a letter
            </h1>
            <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.95; font-weight: 500;">
              A message from your love
            </p>
          </div>

          <!-- Content section -->
          <div style="padding: 50px 40px;">

            <!-- Letter title -->
            <h2 style="margin: 0 0 30px 0; font-size: 22px; color: #1f2937; font-weight: 600; border-bottom: 3px solid #db2777; padding-bottom: 15px;">
              "${letterTitle}"
            </h2>

            <!-- Letter content -->
            <div style="margin-bottom: 40px; color: #374151;">
              ${formattedContent}
            </div>

            <!-- Signature -->
            <div style="border-top: 2px solid #e5e7eb; padding-top: 25px; text-align: center;">
              <p style="margin: 0 0 15px 0; color: #db2777; font-size: 16px; font-weight: 600;">
                With love,<br>${senderName}
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                💕 Project Cupid - Your Digital Love Vault
              </p>
            </div>

          </div>

          <!-- CTA Button -->
          <div style="padding: 0 40px 40px 40px; text-align: center;">
            <a href="#" style="
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

          <!-- Footer -->
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

export function createSimpleNotificationEmail(
  title: string,
  body: string,
  senderName: string,
  recipientName: string
): string {
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

          <div style="background: linear-gradient(135deg, #db2777 0%, #9f1239 100%); padding: 40px 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 600;">💝 ${title}</h1>
          </div>

          <div style="padding: 40px;">
            <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
              ${body}
            </p>

            <p style="margin: 30px 0 0 0; color: #db2777; font-weight: 600;">
              ${senderName}
            </p>
          </div>

        </div>

      </div>

    </body>
    </html>
  `;
}

export function createCuteNotificationEmail(
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

      <!-- Outer wrapper -->
      <div style="background-color: #fff5f5; padding: 40px 20px; min-height: 100vh;">

        <!-- Main card -->
        <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 20px; box-shadow: 0 10px 30px rgba(219,39,119,0.08); overflow: hidden; border: 1px solid #ffe4e6;">

          <!-- Header with cute gradient -->
          <div style="background: ${gradient}; padding: 40px 30px; text-align: center; color: white;">
            <div style="font-size: 54px; margin-bottom: 10px; line-height: 1;">${icon}</div>
            <h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; text-shadow: 0 2px 4px rgba(0,0,0,0.15);">
              ${title}
            </h1>
          </div>

          <!-- Content section -->
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

            <!-- Sign-off -->
            <div style="border-top: 1px solid #f3f4f6; padding-top: 25px;">
              <p style="margin: 0 0 5px 0; color: #4b5563; font-size: 13px;">
                With all my heart,
              </p>
              <p style="margin: 0; color: #db2777; font-size: 16px; font-weight: 700;">
                ${senderName}
              </p>
            </div>

          </div>

          <!-- Footer links -->
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

