# Project Cupid — Integration Architecture (5.0)

```
 Browser (React PWA)                         Vercel: api/index.ts → lib/server/router.ts
 ───────────────────                         ─────────────────────────────────────────────
 Firestore reads/writes  ── rules ──►  Firestore (named DB)  ◄── Firebase Admin ── every member route
 apiFetch(+ID token)  ─────────────────────────────────────►  requireMember(): verify ID token,
                                                              role from users/{uid}
                                        ┌──────────────────────────┼───────────────────────────┐
                                        ▼                          ▼                           ▼
                                SaveState (savestate.co.za)   Jarvis (jarvis.savestate.co.za)  WeddingApp (Supabase REST)
                                - login → custom token        - heartbeat (ping)               - read-only `media` rows
                                - photo booklet + PIN album   - daily activity log (knowledge) - only visibility=public
                                - profile images              - shared memories (knowledge)    - same-host URLs only
                                - mail relay /api/notify/send ◄─ Jarvis calls /api/jarvis/* with JARVIS_API_KEY
```

## Identity

- **Sign-in:** `POST /api/auth/savestate/login` → SaveState checks the password → Cupid looks up `identity_links/ss_<SaveState id>` → `createCustomToken(<linked Cupid uid>)` → the client calls `signInWithCustomToken`. Firestore rules are unchanged by this: the uid and role are the member's existing ones.
- **Linking:** made only by (a) the member, already signed in, proving the SaveState password, or (b) `CUPID_SAVESTATE_LINKS` naming the SaveState **user id**. Email matching is deliberately not a path in: SaveState does not verify emails, and a SaveState account using Razia's address is refused (tested).
- **Sessions:** the member's SaveState token is sealed with AES-256-GCM (`CUPID_SESSION_SECRET`) in `integration_secrets/{uid}`, which the rules close to every client. It is refreshed after 7 days; if SaveState rejects it, the member is asked to sign in again.
- Google sign-in remains as the way to bootstrap and link.
- **Sign-in rate limit:** 8 failures per IP per 15 minutes in Cupid itself. SaveState sees every Cupid sign-in as coming from Vercel's address.

## Memory Integration Layer

`lib/server/memories.ts` is the only place that talks to sources. The client never queries SaveState or WeddingApp.

| Source | Adapter | Reads | Restricted when | Media |
|---|---|---|---|---|
| Cupid | `createMemory`, `addMedia` | — | private memories are owner-only | uploaded to Cupid's PIN-locked SaveState album |
| SaveState booklet | `previewSaveState`, `importRecords` | albums, photos (as the member) | album has a PIN | reference `{albumId, photoId, filename}` |
| WeddingApp | `previewWedding`, `importRecords` | `media` table | `visibility != public`, or URL not on WeddingApp's own storage host | reference `{rowId}`, re-checked on every view |
| Memory Book / Letters | `previewInternal` | Cupid collections | drafts (letters) | none |

Common record (`src/lib/memoryGarden/model.ts`): `ownerId, visibility, title, caption, memoryDate, datePrecision, mediaType, media[], thumbnail, tags, collectionIds, favouritedBy, isSpecialOccasion, status, source, sourceRecordId, provenance, lastOpenedAt`.

- **Dedupe:** imported documents get the id `importDocId(source, sourceRecordId)` and are created with `create()`, so importing twice is a no-op.
- **No copies:** imports keep a reference. The 120 KB thumbnail in the document is the only derived data.
- **Unknown sharing status means private:** imports require the member to choose shared or private, and nothing is imported automatically.
- **Disconnect:** stops previews (WeddingApp) and optionally deletes the member's *references*. The source is never written to.
- **Serving media:** `GET /api/memories/media?id&i&size` re-checks visibility, then fetches from SaveState (with the album PIN only for Cupid's album) or WeddingApp, and streams it with `private` caching.

## Mail

`lib/server/mail.ts`: SaveState's relay as the *sender's own* SaveState account first; Cupid's Resend key second. The server picks the recipient: the other member, deduplicated by email, honouring each member's "email me" setting. Wellbeing and feelings never go by email. All HTML is escaped. The result reports each attempt truthfully.

## Jarvis

- **Cupid → Jarvis:** `lib/server/ecosystem.ts`. Events are written to `ecosystem_log` (kind, actor side, counts — never content). At most every 5 minutes a heartbeat goes out, and every 10 minutes (plus the 22:15 UTC daily cron) today's log is upserted to Jarvis knowledge as `project-cupid-activity-YYYY-MM-DD`. A member can explicitly share a *shared* memory with Jarvis.
- **Jarvis → Cupid:** `/api/jarvis/tools|execute|health` with `JARVIS_API_KEY`. 15 tools, each with a strict schema; reads are shared memories only; changes to an existing memory become `jarvis_proposals` that the memory's owner approves. Every call goes to `jarvis_audit_logs`.

## Why one function

Vercel Hobby allows 12 functions, and 4.1 used all 12. Under `"type": "module"`, per-file functions importing `../src/...` without extensions crashed. One router, imported with explicit `.js` specifiers, fixes both.
