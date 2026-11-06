/**
 * Firebase Admin, initialised once per server instance.
 *
 * Production reads the service account from FIREBASE_SERVICE_ACCOUNT. Tests
 * run against the local emulators (FIRESTORE_EMULATOR_HOST /
 * FIREBASE_AUTH_EMULATOR_HOST), which need no credentials.
 *
 * Imports use the modular entry points (`firebase-admin/app` etc.): the
 * namespace import (`import * as admin`) has no `.apps` under ESM, which is
 * why push notifications silently never ran in production before 5.0.
 */
import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getMessaging, type Messaging } from "firebase-admin/messaging";
import { env, FIREBASE_PROJECT_ID, FIRESTORE_DATABASE_ID } from "./config.js";

let app: App | null = null;
let initError: string | null = null;

function init(): App | null {
  if (app) return app;
  const existing = getApps().find((a) => a.name === "cupid");
  if (existing) return (app = existing);

  try {
    if (env.isEmulator) {
      app = initializeApp({ projectId: process.env.GCLOUD_PROJECT || FIREBASE_PROJECT_ID }, "cupid");
      return app;
    }
    const raw = env.serviceAccount;
    if (!raw) {
      initError = "FIREBASE_SERVICE_ACCOUNT is not set";
      return null;
    }
    const sa = JSON.parse(raw);
    if (sa.project_id && sa.project_id !== FIREBASE_PROJECT_ID) {
      initError = `FIREBASE_SERVICE_ACCOUNT belongs to project ${sa.project_id}, expected ${FIREBASE_PROJECT_ID}`;
      return null;
    }
    app = initializeApp({ credential: cert(sa), projectId: FIREBASE_PROJECT_ID }, "cupid");
    return app;
  } catch (e: any) {
    initError = `FIREBASE_SERVICE_ACCOUNT could not be used: ${e?.message ?? e}`;
    return null;
  }
}

export class AdminUnavailableError extends Error {
  constructor() { super(initError || "Firebase Admin is not configured"); }
}

function need(): App {
  const a = init();
  if (!a) throw new AdminUnavailableError();
  return a;
}

/** An OAuth token for the service account, for Google APIs the Admin SDK doesn't wrap. */
export async function adminAccessToken(): Promise<string> {
  const a = need();
  const cred = a.options.credential;
  if (!cred) throw new AdminUnavailableError();
  return (await cred.getAccessToken()).access_token;
}

export const adminStatus = () => ({ ready: !!init(), error: initError });
export const adminAuth = (): Auth => getAuth(need());
/** The app's named database. Never the (default) one. */
export const adminDb = (): Firestore => getFirestore(need(), FIRESTORE_DATABASE_ID);
export const adminMessaging = (): Messaging => getMessaging(need());
