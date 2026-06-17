# Backend / infra asks for Scrolls Web

Everything web-side that doesn't depend on backend/infra is shipped. The items
below are the remaining blockers — each is **outside the scrolls-web repo**
(Cloudflare R2/Stream config, the shared Supabase edge functions, or the iOS
app). For each: what's blocked, why, the exact change, and how to verify.

Priority order (impact × effort): **1 → 2 → 3 → 4 → 5 → 6**.

---

## 1. R2 bucket CORS — unblocks ALL web media uploads  ⚠️ highest impact
**Blocks:** posting photos, videos, music (cover + tracks), podcasts, article
covers, and avatar changes from the web. Currently every media `PUT` fails with
a browser "Failed to fetch".

**Why:** The web gets a presigned URL from `/upload-token` (works), then `PUT`s
the file directly to Cloudflare R2. The R2 bucket's CORS policy doesn't allow
`PUT` from the web origin, so the browser blocks the request.

**Exact change:** On the media bucket (`media.scrolls-manna.tech` /
`scrolls-media`) add a CORS rule:
- AllowedOrigins: `https://scrolls.adastra.love`
- AllowedMethods: `PUT`, `GET`, `HEAD`
- AllowedHeaders: `*`
- (ExposeHeaders: `ETag`)

**Verify:** From the deployed site, Create → Photo → publish. The `PUT` to R2
returns 200 and the post appears. This one change fixes every upload path at
once (they all use the same flow).

---

## 2. Live broadcast (WHIP) ingest endpoint
**Blocks:** "Go live" from the browser. Live **viewing** already works.

**Why:** Browser broadcasting needs WebRTC/WHIP ingest into Cloudflare Stream.
There's no endpoint that returns a WHIP ingest URL + bearer token for a new
session, and no way to start/stop a session from web.

**Exact change:** Add an authed endpoint, e.g. `POST /live/whip-session`, that
creates a Cloudflare Stream live input and returns:
```json
{ "sessionID": "...", "whipURL": "https://.../webRTC/publish",
  "whipToken": "...", "playbackURL": "...m3u8", "iframePlaybackURL": "..." }
```
plus `POST /live/session/end`. (The `/live/session*` lifecycle — heartbeat,
viewer count, chat, reports — is also still unbuilt natively.)

**Then web can:** capture camera/mic with `getUserMedia` and `RTCPeerConnection`
→ `PUT` the SDP offer to `whipURL` with `whipToken`. No extra deps.

**Verify:** Web "Go live" starts a session that appears in `/live` and plays.

---

## 3. Public by-session / by-moment endpoints — live & moment SHARE pages
**Blocks:** the share-spec pages `/live/<sessionID>` (public) and
`/moment/<momentID>`, and their OG previews ("@user is live on Scrolls").

**Why:** Live/moment data only comes from `GET /moments`, which is **authed and
graph-scoped**. So a shared link can't be resolved for logged-out users or
anyone outside the streamer's graph, and OG cards can't be generated.

**Exact change:** Add anon-readable, single-item endpoints:
- `GET /live/session/<id>` → `{ id, ownerUser{username,displayName,avatar…},
  title, playbackURL, iframePlaybackURL, status: "live"|"ended", replayURL? }`
- `GET /moments/<id>` → moment + `expiresAt` (so the page can show the expired
  state), respecting privacy.
Both should 404/“unavailable” for private/expired/blocked, not leak data.

**Then web can:** render public `/live/<id>` + `/moment/<id>` pages with OG
cards and the "expired" state, matching the post/profile share layer.

**Verify:** Open `/live/<id>` while logged out → live player or ended state.

---

## 4. Circles web messaging — key exchange / readable transport
**Blocks:** reading or sending Circle messages on the web. The `/circles` inbox
lists conversations but shows messages as 🔒 encrypted.

**Why:** Messages are `encryptedText` (AES-GCM) with a **device-local** key
(per the iOS/Android design, even cross-device app installs can't decrypt each
other). The web has no such key, so it can't decrypt existing messages or
produce ciphertext other devices can read.

**Decision needed (pick one):**
- **(a) Server-side envelope/key escrow** for web sessions (server can hand the
  web a per-circle key after auth), or
- **(b) A web key-pair enrolled into each circle** (web device registers a
  public key; senders also encrypt to it), or
- **(c) Explicitly keep Circles app-only** on web (then no further work —
  current inbox + "open in app" is the final state).

**Verify:** Web can render a circle's message text and send a message the app
can read.

---

## 5. In-app track-title search indexing
**Blocks:** finding a song by track title in `/search/posts` (web + app).
Web SEO/JSON-LD for tracks is already shipped.

**Exact change:** See **`docs/MUSIC_TRACK_SEARCH.md`** — recommended: a
denormalized `music_search_text` column populated on write (decode
`[MUSIC_TRACKS_BASE64]`), trigram/`tsvector` GIN index, add to the
`/search/posts` WHERE clause, backfill once.

**Verify:** Searching a track name surfaces its album/EP.

---

## 6. `/posts/by-author` anonymous read (nice-to-have)
**Blocks:** server-rendering a profile's posts for logged-out visitors and the
landing "featured post" (both currently work around it: client-refetch with the
viewer's token; landing uses the pinned post / public feed).

**Why:** `/posts/by-author` requires auth and a lowercased `author_id`.

**Exact change:** Allow anon reads of **public** posts by author (RLS), or add a
public `GET /users/<username>/posts` returning only public posts.

**Verify:** Logged out, a profile shows the author's public posts on first load.

---

## Not a backend ask — iOS app (separate repo)
Share buttons in the iOS app should emit the canonical web URL
`https://scrolls.adastra.love/scroll/<postID>` (and `/user/<username>`,
`/live/<sessionID>`, `/moment/<momentID>`) instead of app-only links. The web
side is ready to receive them. This is an iOS-repo change, not web or backend.
