/**
 * Event emails. Kept as a thin wrapper over the server's notify route so the
 * existing callers keep working; the recipient fields they pass are ignored
 * because the server decides who the partner is.
 */
import { sendPartnerNotification, type NotifyKind } from "./notifications";

export type CupidNotificationEvent =
  | "letter.created" | "letter.scheduled_unlocked" | "letter.reply"
  | "message_box.daily_ready" | "message_box.contributed"
  | "memory.created" | "capsule.unlocked" | "voucher.gifted" | "surprise.sent";

export interface EmailNotificationPayload {
  eventId?: string;
  eventType: CupidNotificationEvent;
  recipientEmail?: string;
  recipientName?: string;
  senderName?: string;
  title: string;
  previewText?: string;
  content?: string;
  deepLink?: string;
  isDiscreet?: boolean;
}

const KIND: Record<CupidNotificationEvent, NotifyKind> = {
  "letter.created": "letter",
  "letter.scheduled_unlocked": "letter",
  "letter.reply": "letter_reply",
  "message_box.daily_ready": "message_box",
  "message_box.contributed": "message_box",
  "memory.created": "memory",
  "capsule.unlocked": "surprise",
  "voucher.gifted": "surprise",
  "surprise.sent": "surprise",
};

export async function dispatchEmailNotification(p: EmailNotificationPayload): Promise<{ success: boolean; error?: string }> {
  try {
    const body = p.isDiscreet ? "Something new is waiting for you in Project Cupid." : (p.previewText || p.content || p.title);
    const r = await sendPartnerNotification({ kind: KIND[p.eventType] ?? "general", title: p.title, body: body.slice(0, 1000), emailBody: p.isDiscreet ? undefined : p.content });
    return r.email.sent > 0 || r.push.sent > 0 ? { success: true } : { success: false, error: r.email.detail.join("; ") || "No delivery channel succeeded (saved in the app)." };
  } catch (e: any) {
    return { success: false, error: e?.message ?? "Notification failed" };
  }
}
