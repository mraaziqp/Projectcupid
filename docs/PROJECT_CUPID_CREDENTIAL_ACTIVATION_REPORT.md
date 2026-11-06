# Project Cupid — Credential Activation Report

Date: 2026-11-05. No secret value appears in this report, in Git, or in any log written during this work.

Vercel project: `moparks-projects-5fd3a0cd/projectcupid` (linked locally; `.vercel/` is gitignored). Vercel marks every value **Sensitive**, so values cannot be read back outside the Vercel runtime. Server-side checks of those values happen through `GET /api/admin/diagnostics`, which only exists once 5.0 is deployed.

## Status

| Credential | Service | Where | Applied | Tested | Result / remaining action |
|---|---|---|---|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | Firebase Admin | Vercel Prod + Preview | existing (172 days old) | **No** — value not readable; 4.1 code never initialised Admin correctly | Verify with diagnostics after the preview deploy |
| `VITE_FIREBASE_VAPID_KEY` | FCM web push | Vercel Prod + Preview (build) | existing | Presence only | Diagnostics checks the format |
| `RESEND_API_KEY` | Resend (fallback mail) | Vercel Prod + Preview | existing | **Real send failed** in production | Probably the suspended key. Create a new sending key at resend.com → API Keys and replace it, or remove it: mail goes through SaveState first now |
| `RESEND_FROM_EMAIL` | Resend sender | Vercel Prod + Preview | existing | not testable without a working key | Domain `verifiedbizlink.co.za`: confirm it is verified in the new key's account |
| `GEMINI_API_KEY` | Google AI (letter drafting) | Vercel Prod + Preview | existing | **Real call: refused, "reported as leaked"** | **You need a new key:** aistudio.google.com/app/apikey → Create API key → `vercel env rm GEMINI_API_KEY` then `vercel env add GEMINI_API_KEY production --sensitive` (and preview) |
| `OLLAMA_API_URL/KEY/MODEL` | Ollama (optional fallback) | Vercel | existing | **Real call: URL not reachable** | Fix or remove; nothing depends on it |
| `CUPID_SESSION_SECRET` | encrypts SaveState sessions | Vercel Prod + Preview | **new, generated** | in tests | — |
| `CUPID_SAVESTATE_ALBUM_PIN` | Cupid's SaveState album | Vercel Prod + Preview | **new, generated** | in tests | — |
| `JARVIS_API_KEY` | Jarvis → Cupid tools | Vercel Prod + Preview | **new, generated** (was unset) | in tests | Nothing in Jarvis calls Cupid yet; give Jarvis this value when a Cupid client is added there |
| `BRIDGE_SECRET` | inbound Memory Book bridge | Vercel Prod + Preview | **new, generated** (was unset) | in tests | No app calls the bridge today |
| `CRON_SECRET` | Vercel Cron → `/api/cron/daily` | Vercel Prod + Preview | **new, generated** | in tests | — |
| `CUPID_LAMP_KEY` | ESP32 Love Lamp | Vercel Prod + Preview | **new, generated** | in tests | Flash it into `ESP32_LoveLamp.ino` when you build the lamp |
| `JARVIS_ECOSYSTEM_KEY` | Cupid → Jarvis (heartbeat, logs) | — | **not yet** | — | Jarvis was down after the 16:39 power-off. Start it from the Agent Builder Host Manager, then register "Project Cupid" (`POST /api/ecosystem/integrations/register`, permissions `ingest_events`, `read_logs`) and add the returned key |
| `CUPID_SAVESTATE_LINKS` | pre-approved SaveState links | — | not set | — | Optional. Tell me which SaveState accounts are yours and Razia's (`mraaziqp`; `razia` or `raz04`) and which Google account Raaziq uses, or each of you links once in Settings |
| `WEDDINGAPP_SUPABASE_URL/_ANON_KEY` | WeddingApp source | — | not set | **Real lookup: the Supabase host no longer exists (NXDOMAIN)** | Needs a live WeddingApp database |
| `SAVESTATE_URL`, `JARVIS_URL`, `CUPID_PUBLIC_URL` | endpoints | defaults in code | n/a | SaveState and Jarvis public URLs answer | — |

The six new secrets have no live dependents (the old values were unset or public fallbacks), so adding them could not interrupt service. Production does not read them until 5.0 is deployed.

## Leaked credentials found in this public repository

| Secret | Where | Status | Action taken |
|---|---|---|---|
| Resend key `re_SRP9…` | `SETUP_COMPLETE.md`, `FINAL_VERIFICATION_CHECKLIST.md`, `GET_KEYS_STEP_BY_STEP.md`, commit `de2508b` | **Suspended** by Resend | Files removed. Still in Git history — harmless now that it is suspended |
| Gemini key `AIzaSyBefE0…` | same files | **Revoked** by Google ("leaked") | Files removed; in history, dead |
| Public fallback bridge keys | `api/*` | were accepted in production | Removed from code; tests prove they are refused |
| Firebase web `apiKey` in `firebase-applet-config.json` | by design | public client identifier, not a secret | Access is controlled by the rules |

Separately: during an emulator run the Firebase CLI (with `DEBUG=true` set in this PC's environment) printed the full process environment, including an `OPENAI_API_KEY` that belongs to another project. It went to a temporary log that was deleted. Consider rotating that key if it matters.
