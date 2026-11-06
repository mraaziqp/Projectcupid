/**
 * Calls to Cupid's own API, signed with the member's Firebase ID token.
 */
import { auth } from "./firebase";

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string, public data?: any) { super(message); }
}

export async function apiFetch<T = any>(path: string, opts: { method?: "GET" | "POST"; body?: unknown; signal?: AbortSignal; auth?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.auth !== false) {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new ApiError(401, "Sign in first.", "unauthenticated");
    headers.Authorization = `Bearer ${token}`;
  }
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  let res: Response;
  try {
    res = await fetch(`/api/${path.replace(/^\//, "")}`, {
      method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
    });
  } catch {
    throw new ApiError(0, "You seem to be offline. Nothing was sent.", "offline");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data?.error || `Request failed (${res.status}).`, data?.code, data);
  return data as T;
}

/** Media bytes from the API as an object URL (img/audio/video cannot send our auth header). */
export async function apiBlobUrl(path: string, signal?: AbortSignal): Promise<string> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new ApiError(401, "Sign in first.");
  const res = await fetch(`/api/${path.replace(/^\//, "")}`, { headers: { Authorization: `Bearer ${token}` }, signal });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data?.error || "Could not load this file.", data?.code);
  }
  return URL.createObjectURL(await res.blob());
}
