/**
 * Email bodies. Every value that came from a person is escaped: letter titles
 * and nudges used to be pasted into the HTML as-is.
 */
import { escapeHtml } from "./crypto.js";
import { env } from "./config.js";

const THEMES = {
  letter: { icon: "💌", band: "#9f1239", accent: "#be185d", kicker: "A letter for you" },
  nudge: { icon: "🧸", band: "#db2777", accent: "#db2777", kicker: "A little nudge" },
  feeling: { icon: "✨", band: "#7e22ce", accent: "#7e22ce", kicker: "How I'm feeling" },
  memory: { icon: "🌿", band: "#4d5b3a", accent: "#6b7a4f", kicker: "A new memory in our garden" },
  general: { icon: "💝", band: "#be123c", accent: "#be123c", kicker: "From Project Cupid" },
} as const;
export type MailTheme = keyof typeof THEMES;

const paragraphs = (s: string) =>
  escapeHtml(s)
    .split(/\n{2,}|\r\n\r\n/)
    .map((p) => `<p style="margin:0 0 14px;line-height:1.75;color:#3f3a36;font-size:16px">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");

export function renderMail(opts: {
  theme: MailTheme;
  title: string;
  body: string;
  senderName: string;
  recipientName: string;
  cta?: string;
}): { subject: string; html: string; text: string } {
  const t = THEMES[opts.theme] ?? THEMES.general;
  const url = env.publicUrl;
  const subject = `${t.icon} ${opts.title}`.slice(0, 180);
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4efe6">
<div style="padding:32px 14px;font-family:Georgia,'Times New Roman',serif">
 <div style="max-width:560px;margin:0 auto;background:#fffdf8;border:1px solid #e8dcc6;border-radius:14px;overflow:hidden">
  <div style="background:${t.band};padding:30px 26px;text-align:center;color:#fff">
   <div style="font-size:40px;line-height:1">${t.icon}</div>
   <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;opacity:.85;margin-top:10px">${escapeHtml(t.kicker)}</div>
   <h1 style="margin:8px 0 0;font-size:24px;font-weight:normal">${escapeHtml(opts.title)}</h1>
  </div>
  <div style="padding:30px 28px">
   <p style="margin:0 0 18px;color:${t.accent};font-style:italic;font-size:16px">Dear ${escapeHtml(opts.recipientName)},</p>
   ${paragraphs(opts.body)}
   <p style="margin:24px 0 0;color:${t.accent};font-size:16px">With love,<br>${escapeHtml(opts.senderName)}</p>
  </div>
  <div style="padding:0 28px 30px;text-align:center">
   <a href="${escapeHtml(url)}" style="display:inline-block;background:${t.accent};color:#fff;text-decoration:none;padding:12px 30px;border-radius:999px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:14px">${escapeHtml(opts.cta ?? "Open Project Cupid")}</a>
  </div>
  <div style="background:#f7f1e6;padding:16px;text-align:center;color:#9a8f80;font-size:12px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif">
   Sent privately by Project Cupid for ${escapeHtml(opts.recipientName)}. Only the two of you can open it.
  </div>
 </div>
</div></body></html>`;
  const text = `${t.kicker}: ${opts.title}\n\nDear ${opts.recipientName},\n\n${opts.body}\n\nWith love,\n${opts.senderName}\n\n${url}`;
  return { subject, html, text };
}
