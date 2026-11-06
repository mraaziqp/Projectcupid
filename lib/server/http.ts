/**
 * The small request/response surface shared by the Vercel function and the
 * local Express server, so one router serves both.
 */
import type { IncomingMessage, ServerResponse } from "node:http";

export interface ApiRequest extends IncomingMessage {
  body?: any;
  query?: Record<string, string | string[] | undefined>;
}
export type ApiResponse = ServerResponse & {
  status?: (code: number) => ApiResponse;
  json?: (body: unknown) => void;
};

export class HttpError extends Error {
  constructor(public status: number, message: string, public code?: string, public extra?: Record<string, unknown>) {
    super(message);
  }
}

export function sendJson(res: ApiResponse, status: number, body: unknown) {
  if (res.headersSent) return;
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

export function header(req: ApiRequest, name: string): string {
  const v = req.headers[name.toLowerCase()];
  return (Array.isArray(v) ? v[0] : v ?? "").toString().trim();
}

export function bearer(req: ApiRequest): string {
  return header(req, "authorization").replace(/^Bearer\s+/i, "").trim();
}

/** The JSON body, whether the platform already parsed it or not. */
export async function jsonBody(req: ApiRequest): Promise<Record<string, any>> {
  if (req.body !== undefined && req.body !== null) {
    if (Buffer.isBuffer(req.body)) return parse(req.body.toString("utf8"));
    if (typeof req.body === "string") return parse(req.body);
    if (typeof req.body === "object") return req.body;
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const c of req as AsyncIterable<Buffer>) {
    size += c.length;
    if (size > 6 * 1024 * 1024) throw new HttpError(413, "Request body is too large.");
    chunks.push(c);
  }
  return chunks.length ? parse(Buffer.concat(chunks).toString("utf8")) : {};
}

function parse(s: string): Record<string, any> {
  if (!s.trim()) return {};
  try {
    const v = JSON.parse(s);
    if (v && typeof v === "object" && !Array.isArray(v)) return v;
  } catch { /* fall through */ }
  throw new HttpError(400, "Body must be a JSON object.");
}

export function queryParam(req: ApiRequest, name: string): string {
  const fromQuery = req.query?.[name];
  if (fromQuery !== undefined) return (Array.isArray(fromQuery) ? fromQuery[0] : fromQuery) ?? "";
  const url = new URL(req.url ?? "/", "http://local");
  return url.searchParams.get(name) ?? "";
}

/** Bounded string from untrusted input. */
export function text(v: unknown, max: number, { required = false, field = "value" } = {}): string {
  if (v === undefined || v === null || v === "") {
    if (required) throw new HttpError(400, `${field} is required.`);
    return "";
  }
  if (typeof v !== "string") throw new HttpError(400, `${field} must be text.`);
  const t = v.trim();
  if (required && !t) throw new HttpError(400, `${field} is required.`);
  if (t.length > max) throw new HttpError(400, `${field} is longer than ${max} characters.`);
  return t;
}

/** Reject keys the endpoint does not know about. */
export function onlyKeys(body: Record<string, unknown>, allowed: string[]) {
  for (const k of Object.keys(body)) {
    if (!allowed.includes(k)) throw new HttpError(400, `Unexpected field '${k}'.`);
  }
}

export async function fetchWithTimeout(url: string, init: RequestInit & { timeoutMs?: number } = {}) {
  const { timeoutMs = 10_000, ...rest } = init;
  return fetch(url, { ...rest, signal: AbortSignal.timeout(timeoutMs) });
}
