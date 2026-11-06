# Project Cupid 5.0 — Production Readiness

**Status: live in production at https://cupid.raziaraaziq.co.za (also https://projectcupid.vercel.app), deployed 2026-11-06.**

## Done and verified live

- Migration: `mraaziqp@gmail.com` → admin and `raziashade4@gmail.com` → sanctuary_owner (both were `reader`, which would have locked them out). Re-running changes nothing. 1 Memory Drop carried into the garden.
- Data intact: 13 letters, 4 replies, 26 notifications, 7 weather entries, 1 drop, 5 cycle logs still owned by Razia.
- Firestore rules and index published to the named database and `(default)`.
- Production diagnostics pass except Gemini and Jarvis ingestion (below).
- Old endpoints answer 404; unauthenticated notify 401; old public keys 401; SaveState login path reaches SaveState and refuses bad credentials.

Rollback: `git show v4.1.4-prepared:firestore.rules > firestore.rules`, deploy; redeploy the previous Vercel deployment from the dashboard. Roles can stay as they are: 4.1 accepts them too.

## Domain

`cupid.raziaraaziq.co.za`: on the Vercel project through the projects API, with `_vercel` TXT and `cupid` CNAME in GoDaddy, verified, HTTPS working, listed in Firebase authorized domains, and `CUPID_PUBLIC_URL` set. The wedding site's DNS records were not changed.

## Still open

1. **Jarvis ingestion.** Needs the key from the public copy, which runs on the Linux machine.
2. **Linking.** Each member links SaveState once in Settings → SaveState.
3. **Not yet exercised with a real signed-in account:** SaveState photo upload, mail through SaveState's relay, push to a device, and the signed-in screens on phone and desktop.

## Mobile

`npm run test:ui` runs the real signed-in app in Chrome at 390x844 and 360x640 plus desktop, covering both accounts, every space, pop-ups and first-run dialogs. It fails on sideways overflow or clipped controls. Across phone screens, undersized tap targets went from 601 to 24, text under 11px from 450 items to 6, and zoom-triggering fields from 56 to 0.

## Git

`main` on GitHub is the released code. Pushes to `main` can redeploy production.
