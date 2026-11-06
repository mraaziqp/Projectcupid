/**
 * Server-side configuration for Project Cupid.
 *
 * Everything secret comes from the environment (Vercel project settings in
 * production, `.env.local` locally). Nothing here has a secret fallback: a
 * missing key disables the feature that needs it and the diagnostics report
 * says so, instead of silently accepting a value that is public on GitHub.
 */

export const FIREBASE_PROJECT_ID = "studio-9165894196-8cf76";
/** The app's data lives in this named database, not in (default). */
export const FIRESTORE_DATABASE_ID = "ai-studio-60c2955c-bef0-41d4-8dcc-ddbec95be891";

export const APP_VERSION = "5.0.0";

/** Roles that make an account a member of the couple's private space. */
export const MEMBER_ROLES = ["admin", "sanctuary_owner", "partner"] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

/**
 * The only Google accounts that may create a member profile on first sign-in.
 * Mirrors the allowlist in firestore.rules — keep them in step.
 */
export const BOOTSTRAP_MEMBERS: Record<string, { role: MemberRole; displayName: string }> = {
  "mraaziqp@gmail.com": { role: "admin", displayName: "Raaziq" },
  "raziashade4@gmail.com": { role: "sanctuary_owner", displayName: "Razia" },
};

const str = (name: string): string => (process.env[name] ?? "").trim();

export const env = {
  get publicUrl() { return (str("CUPID_PUBLIC_URL") || "https://projectcupid.vercel.app").replace(/\/$/, ""); },

  get serviceAccount() { return str("FIREBASE_SERVICE_ACCOUNT"); },

  get resendKey() { return str("RESEND_API_KEY"); },
  get resendFrom() { return str("RESEND_FROM_EMAIL") || "Project Cupid <cupid@savestate.co.za>"; },
  /** Base URL of the Resend API; overridable only so tests can point at a fake. */
  get resendApi() { return (str("RESEND_API_BASE") || "https://api.resend.com").replace(/\/$/, ""); },

  get geminiKey() { return str("GEMINI_API_KEY"); },
  get geminiModel() { return str("GEMINI_MODEL") || "gemini-2.5-flash"; },
  get geminiApi() { return (str("GEMINI_API_BASE") || "https://generativelanguage.googleapis.com").replace(/\/$/, ""); },
  get ollamaUrl() { return str("OLLAMA_API_URL"); },
  get ollamaKey() { return str("OLLAMA_API_KEY"); },
  get ollamaModel() { return str("OLLAMA_MODEL") || "llama3"; },

  /** Encrypts SaveState session tokens held for each member. 32+ random bytes, hex or base64. */
  get sessionSecret() { return str("CUPID_SESSION_SECRET") || str("ENCRYPTION_SECRET"); },

  get savestateUrl() { return (str("SAVESTATE_URL") || "https://savestate.co.za").replace(/\/$/, ""); },
  /** PIN on the SaveState album that holds Cupid's own photos. */
  get savestateAlbumPin() { return str("CUPID_SAVESTATE_ALBUM_PIN"); },
  /**
   * Pre-approved account links: JSON object of SaveState user id → Cupid member email.
   * SaveState ids are assigned by SaveState, so nobody can register their way into a link.
   */
  get savestateLinks(): Record<string, string> {
    const raw = str("CUPID_SAVESTATE_LINKS");
    if (!raw) return {};
    try {
      const v = JSON.parse(raw);
      return v && typeof v === "object" ? v : {};
    } catch { return {}; }
  },

  /** Key Jarvis presents when it calls Cupid's tool API. */
  get jarvisApiKey() { return str("JARVIS_API_KEY"); },
  /** Key other ecosystem apps present on the inbound memory bridge. */
  get bridgeSecret() { return str("BRIDGE_SECRET"); },
  /** Jarvis (Second Brain) base URL and Cupid's own ecosystem integration key there. */
  get jarvisUrl() { return (str("JARVIS_URL") || "https://jarvis.savestate.co.za").replace(/\/$/, ""); },
  get jarvisEcosystemKey() { return str("JARVIS_ECOSYSTEM_KEY"); },

  /** WeddingApp's site; its public media API needs no key. */
  get weddingUrl() { return (str("WEDDINGAPP_URL") || "https://www.raziaraaziq.co.za").replace(/\/$/, ""); },

  /** Key the ESP32 Love Lamp sends; it can only ask "is there an unread letter?". */
  get lampKey() { return str("CUPID_LAMP_KEY"); },

  /** Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. */
  get cronSecret() { return str("CRON_SECRET"); },

  get isEmulator() { return !!str("FIRESTORE_EMULATOR_HOST"); },
};

/** Media limits. The request body cap on Vercel is 4.5 MB; base64 adds a third. */
export const MEDIA_LIMITS = {
  maxUploadBytes: 3 * 1024 * 1024,
  maxThumbnailChars: 120_000,
} as const;
