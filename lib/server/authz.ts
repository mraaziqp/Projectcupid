/**
 * Who is calling. Every member route verifies a Firebase ID token and then
 * reads the caller's role from Firestore — the role in the database decides,
 * never anything the client sends.
 */
import { adminAuth, adminDb } from "./firebaseAdmin.js";
import { MEMBER_ROLES, type MemberRole } from "./config.js";
import { bearer, header, HttpError, type ApiRequest } from "./http.js";
import { secretEquals } from "./crypto.js";

export interface Member {
  uid: string;
  role: MemberRole;
  email: string;
  displayName: string;
}

export async function requireMember(req: ApiRequest): Promise<Member> {
  const token = bearer(req);
  if (!token) throw new HttpError(401, "Sign in first.", "unauthenticated");
  let decoded;
  try {
    decoded = await adminAuth().verifyIdToken(token);
  } catch {
    throw new HttpError(401, "Your session has expired. Sign in again.", "unauthenticated");
  }
  const snap = await adminDb().collection("users").doc(decoded.uid).get();
  const role = snap.get("role") as string | undefined;
  if (!snap.exists || !role || !(MEMBER_ROLES as readonly string[]).includes(role)) {
    throw new HttpError(403, "This account is not part of this private space.", "not_member");
  }
  return {
    uid: decoded.uid,
    role: role as MemberRole,
    email: String(snap.get("email") ?? decoded.email ?? ""),
    displayName: String(snap.get("displayName") ?? decoded.name ?? ""),
  };
}

export async function requireAdmin(req: ApiRequest): Promise<Member> {
  const m = await requireMember(req);
  if (m.role !== "admin") throw new HttpError(403, "Admins only.", "forbidden");
  return m;
}

/** A server-to-server key, from `Authorization: Bearer` or one of the named headers. */
export function requireKey(req: ApiRequest, expected: string, headers: string[], what: string) {
  if (!expected) throw new HttpError(503, `${what} is not configured on this server.`, "not_configured");
  const candidates = [bearer(req), ...headers.map((h) => header(req, h))].filter(Boolean);
  if (!candidates.some((c) => secretEquals(c, expected))) {
    throw new HttpError(401, `Missing or invalid ${what}.`, "unauthorized");
  }
}

/** All member profiles (there are only ever a handful). */
export async function memberProfiles(): Promise<Array<Member & { fcmToken?: string; emailNotifications?: boolean }>> {
  const snap = await adminDb().collection("users").where("role", "in", [...MEMBER_ROLES]).get();
  return snap.docs.map((d) => ({
    uid: d.id,
    role: d.get("role"),
    email: String(d.get("email") ?? ""),
    displayName: String(d.get("displayName") ?? ""),
    fcmToken: d.get("fcmToken") || undefined,
    emailNotifications: d.get("emailNotifications") !== false,
  }));
}

/** Raaziq may have more than one admin account; the "other side" is everyone not in the caller's group. */
export const sideOf = (role: MemberRole) => (role === "admin" ? "him" : "her");
