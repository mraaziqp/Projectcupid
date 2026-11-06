# Project Cupid 5.0 — Production Readiness

**Status: ready for a preview deployment. Not approved for production.**

## Gate

| Item | State |
|---|---|
| Typecheck, unit, rules (named DB), API integration, build | pass (see test report) |
| Secrets in Git / bundle | none in the tree or the bundle; two dead keys remain in old history |
| Private data in logs | ecosystem log is kind/side/counts only (tested); server logs print error messages, not bodies |
| Firestore rules reviewed and emulator tested | yes; **not yet published** |
| API endpoints reviewed | all behind member auth, a server key, or the cron secret, except `health`, `jarvis/health` (no tool list without a key) and SaveState login (rate-limited) |
| New secrets in Vercel | 6 added to Production and Preview; unused until 5.0 is deployed |
| Live credentials verified in the Vercel runtime | **no** — needs the preview |

## Steps that need your approval, in order

1. **Preview deploy** — `vercel deploy` (not `--prod`). Then sign in as admin on the preview, open Settings → Connections → *Run checks*. That tests the service account, FCM, Resend, Gemini, SaveState and Jarvis inside Vercel. Impact: none on production.
2. **New Gemini key** (yours to create; see the credential report). Optional: a new Resend key.
3. **Publish Firestore rules and the index to the named database**: `firebase deploy --only firestore --project studio-9165894196-8cf76`.
   - Impact: the 4.1 production app keeps working for both of you; strangers and old `reader` profiles lose access (intended). The 4.1 client writes notifications without `senderId`, which the new rules refuse — those in-app notifications stop until 5.0 is live. **Publish the rules and deploy 5.0 together.**
   - Rollback: `git show v4.1.4-prepared:firestore.rules > firestore.rules` and deploy.
4. **Production deploy** of 5.0 (merge the feature branch to `main`, or `vercel deploy --prod`).
5. **After deploy:** each of you signs in with Google once and links SaveState (Settings → SaveState), or you send me the account mapping for `CUPID_SAVESTATE_LINKS`. Start Jarvis from the Host Manager so Cupid can be registered (`JARVIS_ECOSYSTEM_KEY`).

No data migration is needed. Existing collections are untouched, and the new ones start empty.

## Git

Work is on branch `feature/cupid-5-memory-garden`, **uncommitted**, as you asked (nothing committed or pushed until it is tested and working end to end). `main`, `v4.1.4-prepared` and the history are untouched.
