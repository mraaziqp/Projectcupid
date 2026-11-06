import { useState } from "react";
import { Mail, Send, CheckCircle, AlertCircle } from "lucide-react";
import GlassPanel from "./GlassPanel";
import { sendPartnerNotification } from "../lib/notifications";

/**
 * Write to your partner by email. The server fills in the address and sends it
 * as "Project Cupid"; replies go to the sender's own inbox.
 */
export default function EmailPartner({ partnerName = "Razia", partnerEmail }: { partnerName?: string; partnerEmail?: string }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim() || sending) return;
    if (!confirm(`Send this email to ${partnerName}?`)) return;
    setSending(true);
    setResult(null);
    try {
      const r = await sendPartnerNotification({
        kind: "note",
        title: subject.trim(),
        body: message.trim().slice(0, 240),
        emailBody: message.trim(),
      });
      if (r.email.sent > 0) {
        setResult({ ok: true, text: `Sent to ${partnerName}${partnerEmail ? ` (${partnerEmail})` : ""}. It's in the app for her too.` });
        setSubject("");
        setMessage("");
      } else if (r.email.failed === 0) {
        setResult({ ok: false, text: `Not emailed: ${partnerName} has email turned off in her settings. It's waiting in the app for her.` });
      } else {
        setResult({ ok: false, text: `The email didn't send, but it's waiting in the app for her. ${r.email.detail.join("; ")}` });
      }
    } catch (err: any) {
      setResult({ ok: false, text: err?.message ?? "That didn't send. Please try again." });
    } finally {
      setSending(false);
    }
  };

  return (
    <GlassPanel className="p-5 sm:p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-rose-500/15 text-rose-300"><Mail className="w-5 h-5" /></div>
        <div>
          <h3 className="text-lg font-serif text-white">Email {partnerName}</h3>
          <p className="text-xs text-white/60">Goes to her inbox from Project Cupid, signed with your name. Her replies come to your email.</p>
        </div>
      </div>
      <form onSubmit={send} className="space-y-3">
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={150}
          required
          placeholder="Subject"
          aria-label="Subject"
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/50 focus:outline-none focus:border-rose-400/50"
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={20000}
          required
          rows={6}
          placeholder={`Write to ${partnerName}…`}
          aria-label="Message"
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/50 focus:outline-none focus:border-rose-400/50"
        />
        <button
          type="submit"
          disabled={sending || !subject.trim() || !message.trim()}
          className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Send className="w-4 h-4" /> {sending ? "Sending…" : `Send to ${partnerName}`}
        </button>
      </form>
      {result && (
        <p className={`flex items-start gap-2 text-xs rounded-lg p-3 border ${result.ok ? "text-emerald-200 bg-emerald-500/10 border-emerald-500/20" : "text-rose-200 bg-rose-500/10 border-rose-500/20"}`}>
          {result.ok ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{result.text}</span>
        </p>
      )}
    </GlassPanel>
  );
}
