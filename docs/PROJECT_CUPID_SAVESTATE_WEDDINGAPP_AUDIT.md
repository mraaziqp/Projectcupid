# SaveState and WeddingApp — Audit

Inspected read-only on 2026-11-05. No data in either system was written or changed. Database reads were limited to user names, roles and access flags, with emails masked.

## SaveState

| | |
|---|---|
| Repo | github.com/mraaziqp/savestate (cloned to `K:\Projects\savestate`); the running host is `G:\Projects\savestate` (package `nexusemu` 1.0.77, server reports 2.0.4) |
| What it is | Self-hosted media and games server: Express (`server.ts`, ~30k lines) + React; Tauri desktop and Capacitor mobile apps |
| Hosting | This PC, through a Cloudflare tunnel → `savestate.co.za`; QNAP NAS failover (`192.168.31.201:3000`) |
| Database | PostgreSQL on Neon (eu-west-2), `pg` pool, SQL migrations in code |
| Auth | Username or email + password (PBKDF2-SHA512), HS256 JWT valid 30 days with sliding refresh; host "brain key" for Jarvis; legacy PIN |
| Users | 17 accounts. ~14 have media access (household and friends). Relevant: `mraaziqp` (ultra_admin), `razia` (admin), `raz04` (user). **None of these three has an email on file.** |
| Photos ("Photo Booklet") | Host-wide albums in `<data>/photos/albums.json`, files beside it. Optional global photo PIN (**currently off**) and per-album PINs. Listing needs SaveState "media" access |
| Booklets | The "Codex" ebook library (`/api/codex/books/*`). Not imported into Cupid: no shared/private model to map |
| Profile images | `profile_images` table, per user, `is_public` flag |
| Mail | `sendNotification()`: AwehChat first, then Resend from `noreply@savestate.co.za`; exposed as `POST /api/notify/send`. `RESEND_API_KEY` is configured on the host |
| CORS | `Access-Control-Allow-Origin: *` |
| Jarvis link | `/api/brain/*` with the brain key; admin "Connections" page logs those calls |

### Security findings in SaveState (not changed — recommendations)

1. **Booklet files are public by id.** `/api/photos/file` and `/api/photos/albums/:a/photos/:p` are on the tokenless list, and the global photo PIN is off. Anyone with an album id and file name or photo id can download a photo from the internet. The ids are random 64-bit hex, so this is an unguessable link, not open listing — but it is not access control.
2. **Album PIN is bypassable.** `GET /api/photos/albums/:a/photos/:p` checks only the global PIN, not the album PIN. Also, the album list returns `coverPhoto` (id and file name of the newest file) for PIN-locked albums. *Cupid works around this by keeping a blank `cover.png` as its album's newest file, so no real photo id is ever listed (tested).*
3. **Open mail relay for members.** `POST /api/notify/send` lets any signed-in SaveState user email any address from `noreply@savestate.co.za`. Sign-up is open. Suggest restricting recipients to members and rate-limiting.
4. PIN hashes use one fixed salt (`sha256(pin + "nexus-photo-salt")`).

### How Cupid uses SaveState

As the member's own account only, never the brain key: sign-in, profile mirror, profile images (the partner sees only `is_public`), Cupid's own album (PIN from `CUPID_SAVESTATE_ALBUM_PIN`, created on first upload, needs SaveState upload permission), booklet imports (non-PIN albums only), and the mail relay.

## WeddingApp

| | |
|---|---|
| Repo | github.com/mraaziqp/weddingapp3.0 (`K:\Projects\Wdding 3.0`; `Wedding invitiation Service` is the same repo) |
| Live site | Vercel project `weddingapp3-0` → www.raziaraaziq.co.za (answers 200) |
| Stack | Next.js; Supabase (Postgres + Storage) for guests, households, media, timeline, gifts; Vercel Blob; Firebase variables also present |
| Media | `media` table: `id, guest_id, media_url, media_type (image/video/audio), visibility (public/private), quest_tag, created_at`; files in public bucket `wedding-photos` |
| RLS | Every table has policy "anon full access" (`using (true) with check (true)`); storage buckets allow anonymous upload. **Anyone with the anon key can read, change or delete every guest record and photo.** |
| **Status of the database** | **The Supabase project in the repo's `.env.production` no longer resolves (NXDOMAIN on Google DNS), and the Vercel project has no `NEXT_PUBLIC_SUPABASE_*` variables.** There is no reachable WeddingApp database to connect Cupid to. |

### What Cupid has for it

A finished, tested adapter (`previewWedding` / `importRecords` / `mediaFor`): read-only; only `visibility = 'public'` rows; only URLs on WeddingApp's own storage host (prevents a row from making Cupid fetch an arbitrary URL); re-checked on every view; disconnect and reconnect. It is switched off until `WEDDINGAPP_SUPABASE_URL` and `WEDDINGAPP_SUPABASE_ANON_KEY` point at a live project.
