# Music track-title search — backend plan

## Goal
Make individual music/EP/album **track titles** findable in search. Today a query
like `Forever` should surface an album whose track 4 is "Forever", even though
that title lives only inside the post caption marker
`[MUSIC_TRACKS_BASE64] <base64(JSON)>`.

## Why the web alone can't do it
Web search calls the shared edge function `GET /search/posts?q=…`. That function
matches against post columns (caption/text) server-side and returns a page of
results. The track titles are **base64-encoded JSON inside the caption**, so a
plain `ILIKE '%Forever%'` on the caption never matches them. Decoding happens
client-side (`lib/music/markers.ts`), which is too late — search is paginated on
the server. So this requires a backend change.

## What the web already does (shipped)
- Renders the full track list in the post and profile cards (server-rendered →
  crawlable HTML).
- Puts track names in the `og:description` and in **schema.org `MusicAlbum` /
  `track` JSON-LD** on `/scroll/<id>` (`lib/seo/postJsonLd.ts`) so Google/Bing
  can index them for web search + rich results.

## Backend patch options (pick one)

### Option A — denormalized search column (recommended)
Add a generated/maintained text column with the decoded, searchable music text.

1. Migration: `ALTER TABLE posts ADD COLUMN music_search_text text;`
2. On write (the post create/update edge functions, or a DB trigger), when the
   caption starts with `[MUSIC]`/`[PODCAST]`:
   - base64-decode the `[MUSIC_TRACKS_BASE64]` payload,
   - JSON-parse it, and
   - store `title + " " + tracks.map(t => t.title).join(" ")` (plus genre/label)
     into `music_search_text`.
3. Index it: `CREATE INDEX posts_music_search_trgm ON posts USING gin (music_search_text gin_trgm_ops);`
   (or a `tsvector` + GIN for full-text).
4. In `/search/posts`, add `music_search_text ILIKE '%' || q || '%'` (or
   `to_tsquery`) to the existing `WHERE` so track titles match.
5. Backfill once for existing posts.

Pros: fast, no per-query decoding, works with the current query path.
Cons: one extra column + write-side decode (already done in Kotlin/Swift — port
the same `[MUSIC_TRACKS_BASE64]` decode to the edge function).

### Option B — decode in the search function
In `/search/posts`, after the SQL prefilter, decode each candidate's
`[MUSIC_TRACKS_BASE64]` and re-filter by track title before returning.

Pros: no schema change.
Cons: only filters within the already-fetched page (misses matches beyond the
limit), CPU per request. Acceptable as a stopgap, not a real index.

## Marker contract (for whoever patches the backend)
Same scheme the clients use (`FeedPostKindMarker` in iOS `ScrollsModels.swift`,
`FeedMarkers` in Android, `lib/music/markers.ts` on web):

- caption line: `[MUSIC_TRACKS_BASE64] <standard-base64(JSON)>`
- JSON: `[{ "id": uuid, "title": string, "audioURL"?: string,
  "durationSeconds"?: number, "lyrics"?: string, "isExplicit": bool }]`
- also useful for search: `[MUSIC_GENRE] …`, `[MUSIC_RECORD_LABEL] …`, and the
  `[MUSIC] {title}` / `[PODCAST] {title}` first line.

## Recommendation
Ship **Option A**. The web SEO/JSON-LD work above already covers public web
search; Option A closes the gap for in-app `/search/posts`.
