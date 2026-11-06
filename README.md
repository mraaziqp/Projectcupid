# Project Cupid

A private space for Raaziq and Razia: letters, message boxes, her wellbeing sanctuary, and (5.0) **The Memory Garden — a living story of us**.

- **Client:** React 19 + Vite + Tailwind, installable PWA.
- **Data:** Firestore, named database `ai-studio-60c2955c-bef0-41d4-8dcc-ddbec95be891` in project `studio-9165894196-8cf76`. Security rules in [firestore.rules](firestore.rules).
- **Server:** one API router ([lib/server/router.ts](lib/server/router.ts)) served by a single Vercel function ([api/index.ts](api/index.ts)) and by [server.ts](server.ts) locally.
- **Ecosystem:** sign-in, photos and mail through **SaveState** (savestate.co.za); activity and shared memories to **Jarvis** (jarvis.savestate.co.za); read-only imports from **WeddingApp**.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in what you need; without FIREBASE_SERVICE_ACCOUNT the API answers "not configured"
npm run dev                  # http://localhost:3000
```

## Test

Needs Java 11+ and the Firebase CLI (`npm i -g firebase-tools`). If `DEBUG=true` is set in your shell, unset it first — the Firebase CLI then prints your whole environment.

```bash
npm test             # typecheck + all suites below
npm run test:unit    # Memory Garden logic
npm run test:rules   # Firestore rules in the emulator, against the named database
npm run test:server  # the API end to end: emulators + local fakes of SaveState, Resend, Gemini, Jarvis, WeddingApp
npm run test:ui      # the signed-in app in Chrome at phone and desktop sizes: screenshots plus overflow and tap-target checks
```

The emulator uses [firebase.emulator.json](firebase.emulator.json): the emulator cannot read the multi-database `firestore` array in [firebase.json](firebase.json) and would otherwise run with no rules at all.

## Deploy

Vercel builds the client (`npm run build:client` → `dist`) and the API function. Environment variables are listed in [.env.example](.env.example). Firestore rules and indexes are deployed separately with `firebase deploy --only firestore` (both databases are listed in firebase.json).

## Documentation

See [docs/](docs/): 5.0 implementation, architecture, credentials, the SaveState/WeddingApp audit, test report and production readiness. Older release notes are in [docs/history/](docs/history/).
