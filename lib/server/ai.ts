/**
 * Letter drafting. Gemini first, then Ollama if one is configured. Each
 * failure is named for what it is (bad key, rate limit, outage, timeout) so
 * the app can say something true instead of "something went wrong".
 */
import { env } from "./config.js";
import { fetchWithTimeout, HttpError } from "./http.js";

export const LETTER_SYSTEM_PROMPT = `You help Raaziq write sincere, warm, protective love letters to his wife Razia.
Avoid clichés. Be specific to what he tells you, appreciate the little things, look forward to the future.
Never invent events, dates or facts that he did not give you. Write in Markdown paragraphs.`;

export type AiFailure = "not_configured" | "invalid_key" | "rate_limited" | "timeout" | "provider_down" | "blocked" | "bad_response";

export class AiError extends HttpError {
  constructor(public reason: AiFailure, message: string, status = 503) { super(status, message, reason); }
}

export async function gemini(prompt: string, system = LETTER_SYSTEM_PROMPT, timeoutMs = Number(process.env.GEMINI_TIMEOUT_MS) || 25_000): Promise<string> {
  if (!env.geminiKey) throw new AiError("not_configured", "GEMINI_API_KEY is not set.");
  let r: Response;
  try {
    r = await fetchWithTimeout(`${env.geminiApi}/v1beta/models/${encodeURIComponent(env.geminiModel)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": env.geminiKey },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts: [{ text: prompt }] }] }),
      timeoutMs,
    });
  } catch (e: any) {
    if (e?.name === "TimeoutError") throw new AiError("timeout", "Gemini took too long to answer.", 504);
    throw new AiError("provider_down", "Gemini could not be reached.");
  }
  const b: any = await r.json().catch(() => ({}));
  if (r.status === 429) throw new AiError("rate_limited", "Gemini's rate limit was reached. Try again in a minute.", 429);
  if (r.status === 400 && /API_KEY_INVALID|API key not valid/i.test(JSON.stringify(b))) throw new AiError("invalid_key", "The Gemini API key is not valid.");
  if (r.status === 401 || r.status === 403) throw new AiError("invalid_key", `Gemini refused the API key${/leaked/i.test(b?.error?.message ?? "") ? " (Google reports it as leaked; a new key is needed)" : ""}.`);
  if (r.status >= 500) throw new AiError("provider_down", "Gemini is having an outage.");
  if (!r.ok) throw new AiError("bad_response", `Gemini answered ${r.status}.`, 502);
  const textOut = b?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text ?? "").join("").trim();
  if (!textOut) {
    if (b?.promptFeedback?.blockReason || b?.candidates?.[0]?.finishReason === "SAFETY") throw new AiError("blocked", "Gemini declined that request.", 422);
    throw new AiError("bad_response", "Gemini returned an empty answer.", 502);
  }
  return textOut;
}

export async function ollama(prompt: string, system = LETTER_SYSTEM_PROMPT): Promise<string> {
  if (!env.ollamaUrl) throw new AiError("not_configured", "OLLAMA_API_URL is not set.");
  let r: Response;
  try {
    r = await fetchWithTimeout(env.ollamaUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(env.ollamaKey ? { Authorization: `Bearer ${env.ollamaKey}` } : {}) },
      body: JSON.stringify({ model: env.ollamaModel, prompt: `${system}\n\n${prompt}`, stream: false }),
      timeoutMs: 25_000,
    });
  } catch (e: any) {
    throw new AiError(e?.name === "TimeoutError" ? "timeout" : "provider_down", "Ollama could not be reached.");
  }
  if (r.status === 401 || r.status === 403) throw new AiError("invalid_key", "Ollama refused the API key.");
  if (!r.ok) throw new AiError("provider_down", `Ollama answered ${r.status}.`);
  const b: any = await r.json().catch(() => ({}));
  const out = b?.response ?? b?.message?.content ?? b?.choices?.[0]?.message?.content;
  if (typeof out !== "string" || !out.trim()) throw new AiError("bad_response", "Ollama returned an empty answer.", 502);
  return out.trim();
}

export async function draftLetter(prompt: string, context: string) {
  const full = `${prompt}\n\nWhat I want you to know (use only this):\n${context || "(nothing extra)"}`;
  try {
    return { text: await gemini(full), provider: "gemini" as const };
  } catch (e) {
    if (!(e instanceof AiError) || !env.ollamaUrl || e.reason === "blocked") throw e;
    try {
      return { text: await ollama(full), provider: "ollama" as const, fallbackReason: e.reason };
    } catch {
      throw e; // report the primary failure; it is the one that needs fixing
    }
  }
}
