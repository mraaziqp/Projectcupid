# Project Cupid 5.0 — The Memory Garden: Implementation

Legend: **I** implemented · **U** unit tested · **E** emulator tested (rules and/or API) · **R** tested against the real external service · **P** awaiting your approval or credentials · **V** deployed and verified (nothing is yet)

| Feature | Where | Status |
|---|---|---|
| The Garden: polaroid grid; filters (all/photos/videos/voice/letters/booklets/favourites/special) plus year, tag, source, search | `src/components/garden/MemoryGarden.tsx`, `MemoryCard.tsx` | I · builds · not yet seen signed-in |
| Our Story timeline by year and month; dates come only from memories, editable | `MemoryGarden.tsx` | I |
| Daily Memory on Home: deterministic per day for both of you, shared-only, avoids the last 6 days, "show me another" remembered, no streaks; categories On this day / adventure / first / ordinary / old favourite / unopened | `garden/DailyMemory.tsx`, `model.ts#pickDailyMemory` | I · U |
| Save This Moment: photo (resized in browser, thumbnail), video ≤3 MB, voice (record or upload) ≤3 MB, words; title, date (defaults to today), tags, optional typed place, special occasion; **visibility has no default** | `garden/SaveMomentModal.tsx`, `POST /api/memories` | I · E |
| Upload safety: type decided by magic bytes, size limits, server-side | `model.ts#validateUpload`, `memories.ts#storeMedia` | I · U · E |
| Two Perspectives: one per person per memory, private until its author shares it | `MemoryTheatre.tsx`, rules `memory_perspectives` | I · E (rules) |
| Memory Inbox: new and imported moments; organise, done, archive | `MemoryGarden.tsx` | I |
| Forgotten Treasures: older than a year or unopened for 90 days, stable per week | `model.ts#forgottenTreasures` | I · U |
| Memory Theatre: large media, slideshow controls (no autoplay), date, caption, provenance, reactions and notes, favourite, edit (owner), add photo, collections, share with Jarvis, delete/remove | `garden/MemoryTheatre.tsx`, `MediaView.tsx` | I · E (server parts) |
| Collections: user-created, shared or private; suggestions such as "Our Firsts" are only suggestions | `MemoryGarden.tsx`, rules `memory_collections` | I · E (rules) |
| Imports with preview: SaveState booklet, WeddingApp, Memory Book, Letters | `garden/SourcesPanel.tsx`, `memories.ts` | I · E (fakes) · WeddingApp **P** (no live DB) |
| Media storage in SaveState (PIN album, blank cover, served through Cupid only) | `memories.ts` | I · E (fake SaveState) · **P** real SaveState upload needs a deployed server |
| Jarvis Memory Garden tools: find, get, on-date, suggest tags/collection, daily memory, propose change (approval) | `lib/server/jarvisTools.ts` | I · E |
| Proposals approval UI | Settings → Connections | I |

## Also changed in 5.0 (outside the Garden)

- **Sign in with SaveState** (`AuthScreen.tsx`), linking and profile mirror (Settings → SaveState), SaveState profile pictures. *I · E*
- **Membership hardening:** profiles only for the three allowlisted, verified Google accounts; `reader` grants nothing; role, email and SaveState fields are server-only. *I · E*
- **Notifications through the server:** partner chosen by the server; push + in-app + email through SaveState, Resend fallback; per-sender hourly limit; real, saved notification preferences. *I · E*
- **Jarvis tools on Firebase Admin**, strict schemas, audit; the public fallback keys are gone. *I · E*
- **Memory Book:** the invented "initial memories" are removed; "Keep Forever" really shares the entry with Jarvis; the bridge stores what it receives. *I · E*
- **Connections dashboard and live credential checks** (no values shown). *I*
- **Love Lamp:** `/api/lamp/status` returns an unread count, nothing else; the sketch was updated. *I*
- **Removed dead code:** 7 unreachable components (≈3,800 lines, including the one that would have emailed cycle events), unused libs, old mock tests, stale how-to docs containing leaked keys.

## Data model (Firestore, named DB)

`memories`, `memory_perspectives` (`<memoryId>_<uid>`), `memory_reactions` (`<memoryId>_<uid>`), `memory_collections`, `daily_memory` (`<uid>_<date>`), `jarvis_proposals`, `import_history`, `integration_links`, `integration_config`, `identity_links`, `integration_secrets`, `ecosystem_log`, `ecosystem_state`, `rate_limits`. Rules for every one are in `firestore.rules`; one composite index is in `firestore.indexes.json`.

## Known limits

- Uploads go through the Vercel function, so each file is capped at 3 MB (photos are resized in the browser first). Longer videos need a direct-to-SaveState upload path; that is not built.
- Media depends on SaveState being up (this PC or the NAS). When it is down, the garden still shows thumbnails and text, and explains why the full file isn't loading.
- Location is a typed label; Cupid never reads device location.
