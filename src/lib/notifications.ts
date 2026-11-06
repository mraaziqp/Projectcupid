/**
 * Telling the other one. The server works out who that is, writes the in-app
 * notification, sends a push and (for most kinds) an email through SaveState.
 * The client never chooses an address.
 */
import { apiFetch } from "./api";

export type NotifyKind = "letter" | "letter_reply" | "nudge" | "feeling" | "memory" | "message_box" | "surprise" | "general" | "wellbeing" | "note";

export interface NotifyResult {
  inApp: number;
  push: { sent: number; failed: number; skipped: number };
  email: { sent: number; failed: number; skipped: number; via: string[]; detail: string[] };
}

export async function sendPartnerNotification(n: { kind: NotifyKind; title: string; body: string; emailBody?: string; email?: boolean; push?: boolean }): Promise<NotifyResult> {
  return apiFetch<NotifyResult>("notify", { body: n });
}

const THEME_KIND: Record<string, NotifyKind> = { nudge: "nudge", feeling: "feeling", general: "general" };

/**
 * Compatibility wrapper for the existing call sites:
 * notifyPartner(myUid, title, body, senderName?, theme?).
 * The uid and sender name are ignored — the server knows who is signed in.
 */
export async function notifyPartner(
  _currentUserId: string,
  title: string,
  body: string,
  _senderName?: string,
  theme?: "nudge" | "feeling" | "general" | NotifyKind,
): Promise<NotifyResult | null> {
  try {
    return await sendPartnerNotification({ kind: THEME_KIND[theme ?? ""] ?? (theme as NotifyKind) ?? "general", title: title.slice(0, 160), body: body.slice(0, 1000) });
  } catch (err) {
    console.warn("Partner notification failed:", (err as Error).message);
    return null;
  }
}
