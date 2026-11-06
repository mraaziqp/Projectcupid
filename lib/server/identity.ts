/**
 * Signing in with SaveState.
 *
 * SaveState checks the username and password; Cupid then signs the member in
 * to Firebase with a custom token for the Cupid account that SaveState account
 * is *linked* to. Firestore rules keep enforcing everything exactly as before,
 * because the Firebase identity (uid, role) is unchanged.
 *
 * A link exists only when one of these made it:
 *   1. the member, signed in to Cupid already, proved the SaveState password
 *      (Settings → SaveState), or
 *   2. CUPID_SAVESTATE_LINKS names that SaveState user id (ids are assigned by
 *      SaveState, so nobody can create an account that matches one).
 * Matching on email is deliberately NOT a way in: SaveState does not verify
 * emails, so anyone could register one with a member's address.
 */
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "./firebaseAdmin.js";
import { env, MEMBER_ROLES } from "./config.js";
import { HttpError } from "./http.js";
import { open, seal } from "./crypto.js";
import * as ss from "./savestate.js";
import { logEvent } from "./ecosystem.js";

const LINKS = "identity_links";
const SECRETS = "integration_secrets";
const REFRESH_AFTER_MS = 7 * 24 * 3600_000;

const linkId = (savestateUserId: string) => `ss_${savestateUserId}`;

function publicProfile(u: ss.SaveStateUser) {
  const avatar = typeof u.avatar === "string" && (/^https:\/\//i.test(u.avatar) || u.avatar.length <= 8) ? u.avatar : null;
  return {
    userId: String(u.id),
    username: u.username,
    displayName: u.display_name || u.username,
    avatar,
    avatarColor: typeof u.avatar_color === "string" && /^#[0-9a-f]{3,8}$/i.test(u.avatar_color) ? u.avatar_color : null,
    bio: typeof u.bio === "string" ? u.bio.slice(0, 500) : null,
    role: u.role ?? null,
    mediaAccess: !!u.media_access,
    canUpload: !!u.can_upload_media,
    syncedAt: new Date().toISOString(),
  };
}

async function assertMemberUid(uid: string) {
  const snap = await adminDb().collection("users").doc(uid).get();
  const role = snap.get("role");
  if (!snap.exists || !(MEMBER_ROLES as readonly string[]).includes(role)) {
    throw new HttpError(403, "That SaveState account is linked to a Cupid account that is no longer a member.", "not_member");
  }
}

/** The Cupid uid a SaveState account may sign in as, or null. */
async function resolveLink(u: ss.SaveStateUser): Promise<string | null> {
  const ref = adminDb().collection(LINKS).doc(linkId(String(u.id)));
  const snap = await ref.get();
  if (snap.exists) return String(snap.get("uid"));

  const email = env.savestateLinks[String(u.id)];
  if (!email) return null;
  let uid: string;
  try {
    uid = (await adminAuth().getUserByEmail(email)).uid;
  } catch {
    return null; // pre-approved, but that Cupid account has never signed in yet
  }
  await ref.set({ uid, savestateUserId: String(u.id), username: u.username, via: "preapproved", linkedAt: FieldValue.serverTimestamp() });
  return uid;
}

async function storeSession(uid: string, token: string, u: ss.SaveStateUser) {
  await adminDb().collection(SECRETS).doc(uid).set(
    { savestate: { token: seal(token), userId: String(u.id), username: u.username, refreshedAt: Date.now(), needsSignIn: false } },
    { merge: true },
  );
  await adminDb().collection("users").doc(uid).set({ savestate: publicProfile(u) }, { merge: true });
}

export async function signInWithSaveState(identifier: string, password: string) {
  const { token, user } = await ss.login(identifier, password);
  const uid = await resolveLink(user);
  if (!uid) {
    void logEvent({ kind: "auth", severity: "warn", summary: "SaveState sign-in for an unlinked account was refused" });
    throw new HttpError(403, "This SaveState account isn't linked to Project Cupid yet. Sign in with Google once, then link it under Settings → SaveState.", "not_linked");
  }
  await assertMemberUid(uid);
  await storeSession(uid, token, user);
  const customToken = await adminAuth().createCustomToken(uid, { ss: String(user.id) });
  void logEvent({ kind: "auth", summary: "Member signed in with SaveState" });
  return { customToken, savestate: publicProfile(user) };
}

export async function linkSaveState(uid: string, identifier: string, password: string) {
  const { token, user } = await ss.login(identifier, password);
  const ref = adminDb().collection(LINKS).doc(linkId(String(user.id)));
  await adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists && snap.get("uid") !== uid) {
      throw new HttpError(409, "That SaveState account is already linked to the other Cupid account.", "already_linked");
    }
    // One SaveState account per Cupid account: drop any older link of this uid.
    const older = await tx.get(adminDb().collection(LINKS).where("uid", "==", uid));
    for (const d of older.docs) if (d.id !== ref.id) tx.delete(d.ref);
    tx.set(ref, { uid, savestateUserId: String(user.id), username: user.username, via: "member", linkedAt: FieldValue.serverTimestamp() });
  });
  await storeSession(uid, token, user);
  void logEvent({ kind: "auth", summary: "Member linked a SaveState account" });
  return { savestate: publicProfile(user) };
}

export async function unlinkSaveState(uid: string) {
  const links = await adminDb().collection(LINKS).where("uid", "==", uid).get();
  const batch = adminDb().batch();
  for (const d of links.docs) batch.delete(d.ref);
  batch.set(adminDb().collection(SECRETS).doc(uid), { savestate: FieldValue.delete() }, { merge: true });
  batch.set(adminDb().collection("users").doc(uid), { savestate: FieldValue.delete() }, { merge: true });
  await batch.commit();
  void logEvent({ kind: "auth", summary: "Member unlinked SaveState" });
}

/**
 * The member's SaveState session token, refreshed when it is over a week old.
 * Throws 409 `savestate_signin_needed` when there is none or it stopped working.
 */
export async function saveStateToken(uid: string): Promise<string> {
  const ref = adminDb().collection(SECRETS).doc(uid);
  const snap = await ref.get();
  const s = snap.get("savestate");
  const token = s?.token ? open(s.token) : null;
  if (!token || s?.needsSignIn) {
    throw new HttpError(409, "Sign in with SaveState again to use your photos and mail.", "savestate_signin_needed");
  }
  if (Date.now() - Number(s.refreshedAt ?? 0) > REFRESH_AFTER_MS) {
    try {
      const fresh = await ss.refresh(token);
      await ref.set({ savestate: { token: seal(fresh), refreshedAt: Date.now() } }, { merge: true });
      return fresh;
    } catch (e) {
      if (e instanceof HttpError && e.code === "savestate_auth") {
        await ref.set({ savestate: { needsSignIn: true } }, { merge: true });
        throw new HttpError(409, "Your SaveState session ended. Sign in with SaveState again.", "savestate_signin_needed");
      }
      // SaveState down: the old token is still within its 30 days.
    }
  }
  return token;
}

/** Re-reads the SaveState profile so name and avatar changes show up in Cupid. */
export async function syncSaveStateProfile(uid: string) {
  const token = await saveStateToken(uid);
  const u = await ss.me(token);
  await adminDb().collection("users").doc(uid).set({ savestate: publicProfile(u) }, { merge: true });
  return publicProfile(u);
}

export async function hasSaveState(uid: string): Promise<boolean> {
  const snap = await adminDb().collection(SECRETS).doc(uid).get();
  return !!snap.get("savestate.token") && !snap.get("savestate.needsSignIn");
}
