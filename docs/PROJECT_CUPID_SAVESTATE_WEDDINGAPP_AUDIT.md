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

The first audit looked at a stale copy in `K:\Projects\Wdding 3.0` and wrongly concluded the database was gone. The current app is `H:\ts\weddingapp3.0` (github.com/mraaziqp/weddingapp3.0).

| | |
|---|---|
| Live site | Vercel project `weddingapp3-0` → www.raziaraaziq.co.za |
| Stack | Next.js; Firestore (project `studio-12716644-3255b`, all client access denied, server uses Admin SDK); media in Google Drive |
| Media API | `GET /api/media?visibility=public` — open, lists only public, unhidden items. `private`/`all` need the admin cookie |
| Files | `GET /api/media/:id/raw`; `/_next/image` gives resized JPEGs |
| Live inventory (2026-11-06) | 152 public items: photographer 32 Ceremony + 15 Nikkah; guests 100 photos, 5 videos |

### How Cupid uses it

Through the public API only, so Cupid holds **no WeddingApp secret** and cannot see anything private. It re-filters on `visibility` and `hidden`, re-checks before serving a file, uses the optimiser for thumbnails and display copies, and never writes back. Imports are chosen in the preview (there is a "select all"). The memory date is the upload date, tagged `upload date`, because the API doesn't carry the event date.

### Finding in WeddingApp (not changed)

`/api/media/:id/raw` does not check visibility: a private item can be downloaded by anyone who has its Drive id. The ids are long and random, and private items aren't listed publicly, so this is an unguessable link rather than an open door, but the route should refuse non-public files unless the admin cookie is present.
