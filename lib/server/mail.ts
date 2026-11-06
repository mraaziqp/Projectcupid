/**
 * Sending mail.
 *
 * 1. SaveState's mail system, as the sender's own SaveState account
 *    (POST savestate.co.za/api/notify/send → SaveState's verified Resend domain).
 * 2. Cupid's own Resend key, if one is configured.
 *
 * The result says exactly what happened; nothing is reported as delivered
 * unless a provider accepted it.
 */
import { env } from "./config.js";
import { fetchWithTimeout } from "./http.js";
import * as ss from "./savestate.js";
import { saveStateToken } from "./identity.js";

export interface MailResult {
  ok: boolean;
  via: "savestate" | "resend" | null;
  attempts: Array<{ via: "savestate" | "resend"; ok: boolean; detail: string }>;
  id?: string;
}

export async function sendViaResend(mail: { to: string; subject: string; html: string; text: string }): Promise<{ ok: boolean; detail: string; id?: string }> {
  if (!env.resendKey) return { ok: false, detail: "RESEND_API_KEY is not set" };
  try {
    const r = await fetchWithTimeout(env.resendApi + "/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.resendKey}` },
      body: JSON.stringify({ from: env.resendFrom, to: [mail.to], subject: mail.subject, html: mail.html, text: mail.text }),
      timeoutMs: 10_000,
    });
    const b: any = await r.json().catch(() => ({}));
    if (r.ok && b?.id) return { ok: true, detail: "accepted by Resend", id: b.id };
    return { ok: false, detail: `Resend answered ${r.status}${b?.name ? ` (${b.name})` : ""}` };
  } catch (e: any) {
    return { ok: false, detail: e?.name === "TimeoutError" ? "Resend did not answer in 10 s" : "Resend not reachable" };
  }
}

export async function sendMail(senderUid: string, mail: { to: string; subject: string; html: string; text: string; eventType: string }): Promise<MailResult> {
  const attempts: MailResult["attempts"] = [];

  let token: string | null = null;
  try { token = await saveStateToken(senderUid); } catch (e: any) {
    attempts.push({ via: "savestate", ok: false, detail: e?.code === "savestate_signin_needed" ? "sender has no SaveState session" : "SaveState session unavailable" });
  }
  if (token) {
    try {
      const r = await ss.sendMail(token, mail);
      attempts.push({ via: "savestate", ok: r.ok, detail: r.detail });
      if (r.ok) return { ok: true, via: "savestate", attempts };
    } catch (e: any) {
      attempts.push({ via: "savestate", ok: false, detail: e?.message ?? "SaveState relay failed" });
    }
  }

  const r = await sendViaResend(mail);
  attempts.push({ via: "resend", ok: r.ok, detail: r.detail });
  return r.ok ? { ok: true, via: "resend", attempts, id: r.id } : { ok: false, via: null, attempts };
}
