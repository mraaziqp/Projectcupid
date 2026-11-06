# Project Cupid 4.1.4 — Home Verification

Date: 2026-11-05 · Machine: home PC (Windows 10, Node 24.14, Java 21.0.11 Temurin, Firebase CLI 14.27)

## Baseline recovered

| Check | Result |
|---|---|
| Local `main` before pull | `ef5d636`, clean, 11 commits behind `origin/main` |
| After `git pull --ff-only` | `67017bf` (matches the reported baseline) |
| Tag `v4.1.4-prepared` | present |
| Uncommitted work to preserve | none |
| `.firebaserc` project | `studio-9165894196-8cf76` — verified against Firebase CLI project list |
| App database | `ai-studio-60c2955c-bef0-41d4-8dcc-ddbec95be891` (from `firebase-applet-config.json`, used by the client and now by the server) |

## What the 4.1.x reports claimed vs what was true

| Claim | Finding (evidence) |
|---|---|
| Emulator suite passes (35/35) | True, but the suite never loaded rules for the named database: the emulator **cannot read** the multi-database `firestore` array in firebase.json ("does not support multiple databases yet… default to allowing all reads and writes"). The 35 passes only exercised rules injected into `(default)` by the test library. |
| Strict membership / no privilege escalation | **False.** Any Google account could create `users/{uid}` with role `sanctuary_owner` or `reader` and then read and write every letter, vault item and message box. Reproduced in the emulator (see 5.0 test report, control run). |
| Jarvis bridge works | **False.** `api/jarvis/*` crashed in production (`FUNCTION_INVOCATION_FAILED`); the tool code used the browser Firebase SDK on the server with no user, so every write was refused by the rules — and the error was swallowed and reported as success. |
| API keys required | **False.** `JARVIS_API_KEY` and `BRIDGE_SECRET` were not set in Vercel; the code fell back to `cupid_jarvis_live_bridge_key` / `cupid-forever-bridge-2024`, which are public on GitHub and were accepted even when a real key was set. |
| Memory Book / Forever Book bridge syncs | **False.** Both bridge endpoints validated input and stored nothing while answering "synced". Forever Book does not call Cupid at all. |
| Verified Resend delivery | **False now.** A live send through production `/api/notify-letter` to Resend's sink address failed. A Resend key committed in this public repo is **suspended** by Resend. |
| Gemini configured | **False now.** Production's Gemini key is rejected by Google: "reported as leaked". A Gemini key committed in this repo is the same state. |
| Email/notification endpoints safe | **False.** `/api/notify-letter`, `/api/notify-robust`, `/api/notify-event`, `/api/notify`, `/api/cupid/generate`, `/api/ollama/generate` had no authentication: anyone could send branded email to any address, push to any FCM token, or spend the AI quota. Letter titles were pasted into email HTML unescaped. |
| Wellbeing never leaves her account | Mostly true in the live app. A component that would push *and email* "Period started" to Raaziq (`LunarCycle.tsx`) existed but was unreachable dead code; it has been deleted. |

## Release gate (4.1.4 code as found)

Not passed: the rules hole and the open endpoints are critical. All of it is fixed in the 5.0 work; see `PROJECT_CUPID_5_0_TEST_REPORT.md` for the emulator results (95/95 on the named database) and the control run that shows the old rules failing 32 of the same tests.
