# Project Cupid — Credential Activation Report

Date: 2026-11-05. No secret value appears in this report, in Git, or in any log written during this work.

Vercel project: `moparks-projects-5fd3a0cd/projectcupid` (linked locally; `.vercel/` is gitignored). Vercel marks every value **Sensitive**, so values cannot be read back outside the Vercel runtime. Server-side checks of those values happen through `GET /api/admin/diagnostics`, which only exists once 5.0 is deployed.

## Status (tested inside production, 2026-11-06)

| Credential | Service | Where | Result | Remaining action |
|---|---|---|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | Firebase Admin | Vercel | **Working**: named DB, Auth, custom tokens | — |
| FCM (same account) | Push | Vercel | **Credentials accepted**; no real delivery to a device tested yet | — |
| `VITE_FIREBASE_VAPID_KEY` | Web push | Vercel | Set, format valid | — |
| `RESEND_API_KEY` | Resend | Vercel, **copied from SaveState at the user's request** | **Working**: real send accepted | Add the CNAME below for full verification |
| `RESEND_FROM_EMAIL` | Sender | Vercel: `cupid@savestate.co.za` | **Working** | — |
| `GEMINI_API_KEY` | Letter drafting | Vercel | **Refused: reported as leaked** | **New key needed.** SaveState does not store one |
| `OLLAMA_*` | Optional fallback | Vercel | URL unreachable | Fix or remove; nothing depends on it |
| `CUPID_SESSION_SECRET`, `CUPID_SAVESTATE_ALBUM_PIN`, `BRIDGE_SECRET`, `CRON_SECRET`, `CUPID_LAMP_KEY` | Internal | Vercel, generated | **Working** (cron secret and diagnostics exercised live) | — |
| `JARVIS_API_KEY` | Jarvis → Cupid | Vercel, generated | **Working**: `cupid_get_status` answered live | Jarvis has no client for it yet |
| `JARVIS_ECOSYSTEM_KEY` | Cupid → Jarvis | **Not set** | The public `jarvis.savestate.co.za` is a different copy from this PC's, with its own database and master key | Register on that copy (see readiness doc) |
| `CUPID_SAVESTATE_LINKS` | Pre-approved links | Not set | The mapping was never confirmed, and it grants sign-in | Link once in Settings, or confirm the mapping |

**Resend domain:** `savestate.co.za` is `partially_verified`. Sending works. For full verification, add in Cloudflare: `CNAME rsend → send.forge.rmta.net`. The reused key was already used by SaveState; the suspended key was replaced.

## Leaked credentials found in this public repository

| Secret | Where | Status | Action taken |
|---|---|---|---|
| Resend key `re_SRP9…` | `SETUP_COMPLETE.md`, `FINAL_VERIFICATION_CHECKLIST.md`, `GET_KEYS_STEP_BY_STEP.md`, commit `de2508b` | **Suspended** by Resend | Files removed. Still in Git history — harmless now that it is suspended |
| Gemini key `AIzaSyBefE0…` | same files | **Revoked** by Google ("leaked") | Files removed; in history, dead |
| Public fallback bridge keys | `api/*` | were accepted in production | Removed from code; tests prove they are refused |
| Firebase web `apiKey` in `firebase-applet-config.json` | by design | public client identifier, not a secret | Access is controlled by the rules |

Separately: during an emulator run the Firebase CLI (with `DEBUG=true` set in this PC's environment) printed the full process environment, including an `OPENAI_API_KEY` that belongs to another project. It went to a temporary log that was deleted. Consider rotating that key if it matters.
