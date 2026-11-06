# Project Cupid 5.0 — Production Readiness

**Status: live in production (https://projectcupid.vercel.app), deployed 2026-11-06.**

## Done and verified live

- Migration: `mraaziqp@gmail.com` → admin and `raziashade4@gmail.com` → sanctuary_owner (both were `reader`, which would have locked them out). Re-running changes nothing. 1 Memory Drop carried into the garden.
- Data intact: 13 letters, 4 replies, 26 notifications, 7 weather entries, 1 drop, 5 cycle logs still owned by Razia.
- Firestore rules and index published to the named database and `(default)`.
- Production diagnostics pass except Gemini and Jarvis ingestion (below).
- Old endpoints answer 404; unauthenticated notify 401; old public keys 401; SaveState login path reaches SaveState and refuses bad credentials.

Rollback: `git show v4.1.4-prepared:firestore.rules > firestore.rules`, deploy; redeploy the previous Vercel deployment from the dashboard. Roles can stay as they are: 4.1 accepts them too.

## Still open

1. **Domain `cupid.raziaraaziq.co.za`.** `raziaraaziq.co.za` is held outside this Vercel team, so the CLI gets 403 and a dashboard verification is needed. Then: GoDaddy DNS (`cname.vercel-dns.com` plus the `_vercel` TXT Vercel shows), Firebase Console → Authentication → Authorized domains (for Google sign-in), and `CUPID_PUBLIC_URL`.
2. **Jarvis ingestion.** Needs the key from the public copy.
3. **Gemini.** New key.
4. **Linking.** Each member links SaveState once in Settings → SaveState.
5. **Not yet exercised with a real signed-in account:** SaveState photo upload, mail through SaveState's relay, push to a device, and the signed-in screens on phone and desktop.

## Git

`main` on GitHub is the released code. Pushes to `main` can redeploy production.
