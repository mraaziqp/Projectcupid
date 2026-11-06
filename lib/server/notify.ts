/**
 * Telling the other one. The server decides who the partner is and which
 * address to use; the client only says what happened.
 */
import { FieldValue } from "firebase-admin/firestore";
import { adminDb, adminMessaging } from "./firebaseAdmin.js";
import { memberProfiles, sideOf, type Member } from "./authz.js";
import { HttpError } from "./http.js";
import { renderMail, type MailTheme } from "./mailTemplates.js";
import { sendMail } from "./mail.js";
import { logEvent } from "./ecosystem.js";

export const NOTIFY_KINDS = ["letter", "letter_reply", "nudge", "feeling", "memory", "message_box", "surprise", "general", "wellbeing"] as const;
export type NotifyKind = (typeof NOTIFY_KINDS)[number];

/** Kinds that may never leave Cupid by email (they can carry wellbeing context). */
const NO_EMAIL: NotifyKind[] = ["wellbeing", "feeling"];
const HOURLY_LIMIT = 40;

const THEME: Record<NotifyKind, MailTheme> = {
  letter: "letter", letter_reply: "letter", nudge: "nudge", feeling: "feeling", memory: "memory",
  message_box: "general", surprise: "general", general: "general", wellbeing: "general",
};

const firstName = (m: { displayName: string; role: string }) =>
  (m.displayName || (m.role === "admin" ? "Raaziq" : "Razia")).split(" ")[0];

async function rateLimit(uid: string) {
  const hour = new Date().toISOString().slice(0, 13);
  const ref = adminDb().collection("rate_limits").doc(`notify_${uid}_${hour}`);
  const n = await adminDb().runTransaction(async (tx) => {
    const s = await tx.get(ref);
    const next = Number(s.get("n") ?? 0) + 1;
    tx.set(ref, { n: next, expiresAt: new Date(Date.now() + 2 * 3600_000) }, { merge: true });
    return next;
  });
  if (n > HOURLY_LIMIT) throw new HttpError(429, "That's a lot of notifications in one hour. The rest are saved in the app.", "rate_limited");
}

export interface NotifyRequest {
  kind: NotifyKind;
  title: string;
  body: string;
  /** Letters: the full text goes in the email. */
  emailBody?: string;
  email?: boolean;
  push?: boolean;
}

export async function notifyPartner(sender: Member, n: NotifyRequest) {
  if (n.kind === "wellbeing") {
    // Her wellbeing updates go out only if she switched sharing on herself.
    const s = await adminDb().collection("wellbeing_settings").doc(sender.uid).get();
    if (s.get("sharePartnerUpdates") !== true) {
      throw new HttpError(403, "Wellbeing updates are private unless you turn on sharing in your wellbeing settings.", "sharing_off");
    }
  }
  await rateLimit(sender.uid);

  const members = await memberProfiles();
  const me = members.find((m) => m.uid === sender.uid) ?? sender;
  const recipients = members.filter((m) => sideOf(m.role) !== sideOf(sender.role));
  if (!recipients.length) throw new HttpError(404, "There is no partner account to notify yet.", "no_partner");
  const senderName = firstName(me);

  const batch = adminDb().batch();
  for (const r of recipients) {
    batch.set(adminDb().collection("notifications").doc(), {
      userId: r.uid, senderId: sender.uid, sentBy: senderName, kind: n.kind,
      title: n.title, body: n.body, read: false, createdAt: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();

  const push = { sent: 0, failed: 0, skipped: 0 };
  if (n.push !== false) {
    const tokens = [...new Set(recipients.map((r) => r.fcmToken).filter(Boolean))] as string[];
    push.skipped = recipients.length - tokens.length;
    for (const token of tokens) {
      try {
        await adminMessaging().send({
          token,
          notification: { title: n.title, body: n.body.slice(0, 240) },
          webpush: { notification: { icon: "/pwa-192x192.png" }, fcmOptions: { link: "/" } },
        });
        push.sent++;
      } catch (e: any) {
        push.failed++;
        // A token FCM no longer knows will never work again; forget it.
        if (/registration-token-not-registered|invalid-registration-token/.test(e?.code ?? "")) {
          const owner = recipients.find((r) => r.fcmToken === token);
          if (owner) await adminDb().collection("users").doc(owner.uid).update({ fcmToken: FieldValue.delete() }).catch(() => {});
        }
      }
    }
  }

  const email = { sent: 0, failed: 0, skipped: 0, via: [] as string[], detail: [] as string[] };
  const emailAllowed = n.email !== false && !NO_EMAIL.includes(n.kind);
  if (emailAllowed) {
    const seen = new Set<string>();
    for (const r of recipients) {
      const to = r.email.toLowerCase();
      if (!to || !r.emailNotifications || seen.has(to)) { email.skipped++; continue; }
      seen.add(to);
      const m = renderMail({ theme: THEME[n.kind], title: n.title, body: n.emailBody || n.body, senderName, recipientName: firstName(r) });
      const res = await sendMail(sender.uid, { to, ...m, eventType: n.kind });
      if (res.ok) { email.sent++; email.via.push(res.via!); } else email.failed++;
      email.detail.push(...res.attempts.map((a) => `${a.via}: ${a.detail}`));
    }
  } else {
    email.skipped = recipients.length;
  }

  await adminDb().collection("notificationLogs").add({
    at: FieldValue.serverTimestamp(), kind: n.kind, senderSide: sideOf(sender.role),
    recipients: recipients.length, push, email: { sent: email.sent, failed: email.failed, skipped: email.skipped, via: email.via },
  });
  void logEvent({
    kind: "notify", actor: sideOf(sender.role),
    severity: email.failed || push.failed ? "warn" : "info",
    summary: `${n.kind} notification: push ${push.sent} sent/${push.failed} failed, email ${email.sent} sent/${email.failed} failed`,
  });

  return { inApp: recipients.length, push, email };
}
