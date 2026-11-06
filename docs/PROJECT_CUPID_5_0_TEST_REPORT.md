# Project Cupid 5.0 — Test Report

Run on 2026-11-05 on the home PC. Command: `npm test` (with `DEBUG` unset).

| Suite | What it exercises | Result |
|---|---|---|
| Typecheck (`tsc --noEmit`) | whole repo: client, server, tests | **pass** |
| Unit (`tests/model.unit.test.ts`) | daily selection, treasures, byte sniffing, limits, ids, config agreement | **21 / 21** |
| Rules (`tests/rules.emulator.test.ts`) | real `firestore.rules` in the Firestore emulator, **named database**, Google-style tokens for Raaziq, Razia, a stranger, an unverified allowlisted account, a legacy reader and an anonymous client | **95 / 95** |
| API integration (`tests/server.integration.test.ts`) | the real router + Firestore and Auth emulators + local fakes of SaveState, Resend, Gemini, Jarvis, WeddingApp; two real member accounts and a stranger | **85 / 85** (run twice) |
| Production build | `vite build`; server and API bundles with esbuild | **pass**; Garden is its own lazy chunk; no server code or secrets in the bundle |
| Local smoke | `npm run dev`: index, Garden modules, `/api/health`, auth routes | **pass**; without a service account the API answers `not_configured` |

## Control run: the same rules suite against the 4.1.4 rules

32 failures, including: a stranger can make themselves `sanctuary_owner` (full access), unverified accounts can bootstrap, legacy readers keep access, strangers can list profiles, members can rewrite their email, admin can rewrite Razia's profile, audit logs can be forged, strangers can read notifications. The rest of the failures are the Memory Garden collections that did not exist yet. This shows the suite detects real holes.

## Covered (selected)

- **Auth and roles:** unauthenticated, stranger, unverified, and wrong-uid profile creation are all denied; no self-promotion; no role/email/SaveState forgery; profiles cannot be deleted.
- **Wellbeing:** for all six wellbeing collections, admin can't get or list them, can't forge ownership, can't transfer, can't delete; settings are owner-only; wellbeing notifications are refused unless she opted in, and never emailed.
- **Server-only data:** secrets, links, rate limits, config and logs are unreadable or unwritable from clients; audit and notification logs are append-only.
- **Memory Garden rules:** shared vs private reads; unfiltered list refused; clients can't create media or "imported" memories, forge owner, change source or provenance or media, or use bad dates or unknown fields; partner may only favourite/open/file shared memories; perspectives hidden until shared; reactions only on shared memories; collection permissions; daily picks private.
- **SaveState sign-in:** unlinked refused; **email-impostor account refused**; wrong password; link → login → the right uid; pre-approved link; cross-link refused; encrypted at rest; rate limit at 8 failures.
- **Mail:** partner chosen by the server; HTML escaped; SaveState relay → Resend fallback → truthful total failure; recipient injection refused.
- **Media:** PIN album created; blank cover kept newest; non-image, mismatched and oversized files refused; partner sees shared media but not private (404); stranger refused; SaveState offline → clear 503; owner delete removes the file from SaveState.
- **Imports:** PIN album refused; dedupe; provenance kept; visibility required; WeddingApp private and off-site rows refused; disconnect removes only references and the source rows remain; draft letters never imported.
- **Jarvis:** no key, old public keys, unknown tool, extra params all refused; writes really persist; drafts unpublished; shared-only search; private-by-id looks missing; anniversaries; proposal → owner-only approval → applied; audited.
- **Bridge:** secret required; old public secret refused; health content refused; stored; duplicate detected.
- **Gemini:** success; leaked/invalid key; 429; outage; timeout (504); Ollama fallback.
- **Ecosystem:** cron sends heartbeat and activity; **log contains no titles, captions, notes or emails**; cron secret enforced; only owners share *shared* memories with Jarvis.
- **Diagnostics:** every check reported, no secret value in the output.

## Not covered yet (honest list)

- **Nothing has run against the real Vercel runtime.** The preview deploy was blocked pending your approval, so `FIREBASE_SERVICE_ACCOUNT`, FCM, real SaveState uploads and mail through the real relay are untested in production.
- **UI not exercised signed in.** The screens compile and load, but Google sign-in can't be automated here. Desktop and mobile layout, keyboard and screen-reader checks still need a manual pass.
- Real Jarvis ingestion (Jarvis was down after the power-off; Cupid isn't registered yet).
- WeddingApp against a real database (none exists).
- Real FCM delivery to a device.
- The Vercel ESM resolution of `lib/server/*.js` imports is the main deployment risk to confirm on the preview.
