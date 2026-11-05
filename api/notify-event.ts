import { Resend } from "resend";
import { generateStorybookEmailHtml, EmailNotificationPayload } from "../src/lib/emailService";

// In-memory idempotency cache for duplicate request suppression
const processedEvents = new Map<string, { timestamp: number; response: any }>();

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const idempotencyKey =
    req.headers["x-idempotency-key"] ||
    req.body?.eventId ||
    `idem_${Date.now()}`;

  // Check idempotency (within last 10 minutes)
  const existing = processedEvents.get(idempotencyKey);
  if (existing && Date.now() - existing.timestamp < 10 * 60 * 1000) {
    return res.status(200).json({
      ...existing.response,
      idempotentReplay: true
    });
  }

  try {
    const payload = req.body as EmailNotificationPayload;
    const { recipientEmail, title, eventType } = payload ?? {};

    if (!recipientEmail || !title) {
      return res.status(400).json({
        error: "Missing required fields: recipientEmail and title are mandatory"
      });
    }

    const { subject, html } = generateStorybookEmailHtml(payload);
    const resendApiKey = process.env.RESEND_API_KEY;

    // Simulation / graceful fallback if API key is not yet set
    if (!resendApiKey) {
      const simulatedResponse = {
        success: true,
        isSimulation: true,
        messageId: `sim_${Date.now()}_resend`,
        recipient: recipientEmail,
        eventType,
        subject,
        timestamp: new Date().toISOString(),
        note: "RESEND_API_KEY environment variable is not configured. Email logged in simulation mode."
      };

      console.log(`[Project Cupid Email] Simulated dispatch to ${recipientEmail}: "${subject}"`);
      processedEvents.set(idempotencyKey, { timestamp: Date.now(), response: simulatedResponse });
      return res.status(200).json(simulatedResponse);
    }

    // Real dispatch via Resend
    const resend = new Resend(resendApiKey);
    const fromAddress =
      process.env.RESEND_FROM_EMAIL ||
      "Project Cupid <cupid@verifiedbizlink.co.za>";

    const sendResult = await resend.emails.send({
      from: fromAddress,
      to: recipientEmail,
      subject,
      html
    });

    if (sendResult.error) {
      console.warn("[Project Cupid Email] Resend delivery error:", sendResult.error);
      return res.status(500).json({
        success: false,
        error: sendResult.error.message || "Failed to deliver email through Resend"
      });
    }

    const responsePayload = {
      success: true,
      emailId: sendResult.data?.id,
      recipient: recipientEmail,
      subject,
      timestamp: new Date().toISOString()
    };

    processedEvents.set(idempotencyKey, { timestamp: Date.now(), response: responsePayload });
    return res.status(200).json(responsePayload);
  } catch (error: any) {
    console.error("[Project Cupid Email] Unexpected error:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Internal email notification error"
    });
  }
}
