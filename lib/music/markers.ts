import type { ScrollsPost } from "@/lib/types/scrolls";

/**
 * Parses the inline caption markers iOS uses to carry music-post data.
 *
 * Music/podcast posts are ordinary `audio`/`text` posts whose caption begins
 * with a `[MUSIC]`/`[PODCAST]` marker line, followed by structured marker lines
 * the iOS app (and the Android port's `FeedMarkers`) read back out. This module
 * is a faithful port of `FeedPostKindMarker` / `parseAudioCaptionMetadata` in
 * the iOS `ScrollsModels.swift`, so the web renders the same data without any
 * new backend support.
 */

const MARKER = {
  photoCarousel: "[PHOTO_CAROUSEL_BASE64]",
  article: "[ARTICLE]",
  articleJSON: "[ARTICLE_JSON]",
  music: "[MUSIC]",
  podcast: "[PODCAST]",
  musicLoopVideo: "[MUSIC_LOOP_VIDEO]",
  audioLoopVideo: "[AUDIO_LOOP_VIDEO]",
  releaseType: "[MUSIC_RELEASE_TYPE]",
  tracks: "[MUSIC_TRACKS_BASE64]",
  releaseDate: "[MUSIC_RELEASE_DATE]",
  recordLabel: "[MUSIC_RECORD_LABEL]",
  genre: "[MUSIC_GENRE]",
  linerNotes: "[MUSIC_LINER_NOTES_BASE64]",
  videoLinks: "[MUSIC_VIDEO_LINKS_BASE64]",
  collaborators: "[SCROLL_COLLABORATORS_BASE64]"
} as const;

/** Every structured marker prefix, used to strip markers from display captions. */
const ALL_MARKERS = Object.values(MARKER);

export type MusicReleaseType = "album" | "singlesEPs";

export type MusicTrack = {
  id: string;
  title: string;
  audioURL?: string | null;
  durationSeconds?: number | null;
  lyrics?: string | null;
  isExplicit: boolean;
};

export type ParsedMusic = {
  isMusic: boolean;
  isPodcast: boolean;
  /** Human title from the `[MUSIC] {title}` first line, marker stripped. */
  title: string | null;
  releaseType: MusicReleaseType | null;
  tracks: MusicTrack[];
  releaseDate: string | null;
  recordLabel: string | null;
  genre: string | null;
  linerNotes: string | null;
  videoLinkIDs: string[];
  loopVideoURL: string | null;
};

function firstNonEmptyLine(caption?: string | null): string | null {
  if (!caption) return null;
  for (const raw of caption.split(/\r?\n/)) {
    const line = raw.trim();
    if (line) return line;
  }
  return null;
}

function startsWithMarker(caption: string | null | undefined, marker: string): boolean {
  const first = firstNonEmptyLine(caption);
  return first ? first.toUpperCase().startsWith(marker) : false;
}

export function isMusicPost(caption?: string | null): boolean {
  return startsWithMarker(caption, MARKER.music);
}

export function isPodcastPost(caption?: string | null): boolean {
  return startsWithMarker(caption, MARKER.podcast);
}

export function isMusicOrPodcast(post: ScrollsPost): boolean {
  return isMusicPost(post.caption) || isPodcastPost(post.caption);
}

/** Cross-runtime (server + browser) UTF-8 base64 decode. */
function decodeBase64Utf8(b64: string): string | null {
  const trimmed = b64.trim();
  if (!trimmed) return null;
  try {
    const binary = atob(trimmed);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

function lineSuffix(line: string, marker: string): string {
  return line.slice(marker.length).trim();
}

function parseTracks(suffix: string): MusicTrack[] {
  const json = decodeBase64Utf8(suffix);
  if (!json) return [];
  try {
    const raw = JSON.parse(json);
    if (!Array.isArray(raw)) return [];
    return raw.map((entry: Record<string, unknown>) => ({
      id: String(entry.id ?? ""),
      title: String(entry.title ?? ""),
      audioURL: (entry.audioURL as string | undefined) ?? null,
      durationSeconds:
        typeof entry.durationSeconds === "number" ? entry.durationSeconds : null,
      lyrics: (entry.lyrics as string | undefined) ?? null,
      isExplicit: entry.isExplicit === true
    }));
  } catch {
    return [];
  }
}

function parseStringArray(suffix: string): string[] {
  const json = decodeBase64Utf8(suffix);
  if (!json) return [];
  try {
    const raw = JSON.parse(json);
    return Array.isArray(raw) ? raw.map((v) => String(v)).filter(Boolean) : [];
  } catch {
    return [];
  }
}

/**
 * Parses the music metadata out of a post's caption. Safe to call on any post —
 * returns `isMusic: false` for non-music captions.
 */
export function parseMusicPost(caption?: string | null): ParsedMusic {
  const empty: ParsedMusic = {
    isMusic: false,
    isPodcast: false,
    title: null,
    releaseType: null,
    tracks: [],
    releaseDate: null,
    recordLabel: null,
    genre: null,
    linerNotes: null,
    videoLinkIDs: [],
    loopVideoURL: null
  };

  const music = isMusicPost(caption);
  const podcast = isPodcastPost(caption);
  if (!music && !podcast) return empty;

  let title: string | null = null;
  let releaseType: MusicReleaseType | null = null;
  let tracks: MusicTrack[] = [];
  let releaseDate: string | null = null;
  let recordLabel: string | null = null;
  let genre: string | null = null;
  let linerNotes: string | null = null;
  let videoLinkIDs: string[] = [];
  let loopVideoURL: string | null = null;

  // Mirror iOS exactly: strip the leading [MUSIC]/[PODCAST] marker from the
  // whole caption first, then parse the remainder line by line. iOS packs the
  // first payload entry onto the marker line, so an empty display caption still
  // parses correctly. Non-marker lines become the display title/caption.
  const headPrefix = music ? MARKER.music : MARKER.podcast;
  const trimmedCaption = (caption ?? "").trim();
  const remainder = trimmedCaption.slice(headPrefix.length);
  const displayLines: string[] = [];

  for (const raw of remainder.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const upper = line.toUpperCase();

    if (upper.startsWith(MARKER.releaseType)) {
      const v = lineSuffix(line, MARKER.releaseType).toLowerCase();
      if (v === "album") releaseType = "album";
      else if (v === "singleseps") releaseType = "singlesEPs";
      continue;
    }
    if (upper.startsWith(MARKER.tracks)) {
      tracks = parseTracks(lineSuffix(line, MARKER.tracks));
      continue;
    }
    if (upper.startsWith(MARKER.releaseDate)) {
      const v = lineSuffix(line, MARKER.releaseDate);
      if (v) releaseDate = v;
      continue;
    }
    if (upper.startsWith(MARKER.recordLabel)) {
      const v = lineSuffix(line, MARKER.recordLabel);
      if (v) recordLabel = v;
      continue;
    }
    if (upper.startsWith(MARKER.genre)) {
      const v = lineSuffix(line, MARKER.genre);
      if (v) genre = v;
      continue;
    }
    if (upper.startsWith(MARKER.linerNotes)) {
      const v = decodeBase64Utf8(lineSuffix(line, MARKER.linerNotes));
      if (v) linerNotes = v;
      continue;
    }
    if (upper.startsWith(MARKER.videoLinks)) {
      videoLinkIDs = parseStringArray(lineSuffix(line, MARKER.videoLinks));
      continue;
    }
    if (upper.startsWith(MARKER.musicLoopVideo) || upper.startsWith(MARKER.audioLoopVideo)) {
      const marker = upper.startsWith(MARKER.musicLoopVideo) ? MARKER.musicLoopVideo : MARKER.audioLoopVideo;
      const v = lineSuffix(line, marker);
      if (v) loopVideoURL = v;
      continue;
    }
    // Other structured markers (carousel, collaborators, article) can ride
    // along on a music post; never let their raw text leak into the title.
    if (ALL_MARKERS.some((m) => upper.startsWith(m))) continue;
    displayLines.push(line);
  }

  title = displayLines.join("\n").trim() || null;

  return {
    isMusic: music,
    isPodcast: podcast,
    title,
    releaseType,
    tracks,
    releaseDate,
    recordLabel,
    genre,
    linerNotes,
    videoLinkIDs,
    loopVideoURL
  };
}

/**
 * Returns the caption with every known structured marker line removed, suitable
 * for display. Works for music, article, and carousel posts alike, so raw
 * markers never leak into the UI or share metadata.
 */
export function strippedCaption(caption?: string | null): string | null {
  if (!caption) return null;
  const kept = caption
    .split(/\r?\n/)
    .filter((line) => {
      const up = line.trim().toUpperCase();
      return !ALL_MARKERS.some((m) => up.startsWith(m));
    })
    .join("\n")
    .trim();
  return kept || null;
}

/** Extra carousel photo URLs encoded in a photo post's caption (beyond the asset). */
export function photoCarouselURLs(caption?: string | null): string[] {
  if (!caption) return [];
  for (const raw of caption.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line.toUpperCase().startsWith("[PHOTO_CAROUSEL_BASE64]")) continue;
    return parseStringArray(line.slice("[PHOTO_CAROUSEL_BASE64]".length).trim());
  }
  return [];
}

/** Formats a track duration in seconds as `m:ss`. */
export function formatDuration(seconds?: number | null): string | null {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return null;
  const total = Math.round(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/** "12 songs, 39 minutes" style summary; falls back to just the count. */
export function runtimeSummary(tracks: MusicTrack[]): string {
  const count = tracks.length;
  const songWord = count === 1 ? "song" : "songs";
  const totalSeconds = tracks.reduce(
    (sum, t) => (t.durationSeconds && t.durationSeconds > 0 ? sum + t.durationSeconds : sum),
    0
  );
  if (totalSeconds <= 0) return `${count} ${songWord}`;
  const minutes = Math.max(1, Math.round(totalSeconds / 60));
  return `${count} ${songWord}, ${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
}

/** Formats an ISO full-date (`yyyy-MM-dd`) release date for display. */
export function formatReleaseDate(iso?: string | null): string | null {
  if (!iso) return null;
  const parsed = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC"
  });
}

export function releaseTypeLabel(type: MusicReleaseType | null): string | null {
  if (type === "album") return "Album";
  if (type === "singlesEPs") return "Single / EP";
  return null;
}

// ── Composer (caption assembly) ──────────────────────────────────────────────

/** Genre options, matching iOS `MusicGenreOption` raw values exactly. */
export const MUSIC_GENRES = [
  "Pop",
  "Rock",
  "Dance",
  "Hip-Hop / Rap",
  "Electronic",
  "R&B / Soul",
  "Country",
  "Classical",
  "Jazz",
  "Blues",
  "Folk",
  "Reggae",
  "World / Global"
] as const;

export const RELEASE_TYPE_OPTIONS: { value: MusicReleaseType; label: string }[] = [
  { value: "album", label: "Album" },
  { value: "singlesEPs", label: "Single / EP" }
];

/** Cross-runtime UTF-8 base64 encode (inverse of `decodeBase64Utf8`). */
function encodeBase64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export type MusicCaptionInput = {
  isPodcast: boolean;
  caption?: string | null;
  releaseType?: MusicReleaseType | null;
  tracks: MusicTrack[];
  releaseDate?: string | null;
  recordLabel?: string | null;
  genre?: string | null;
  linerNotes?: string | null;
};

/**
 * Builds the music/podcast caption marker string, byte-compatible with the iOS
 * `FeedPost.musicCaption(...)` / `podcastCaption(...)` assemblers so posts
 * created on the web parse identically in the iOS and Android apps.
 */
export function buildMusicCaption(input: MusicCaptionInput): string {
  const head = input.isPodcast ? MARKER.podcast : MARKER.music;
  const trimmed = (input.caption ?? "").trim();
  const payload: string[] = [];

  if (trimmed) payload.push(trimmed);

  if (!input.isPodcast) {
    if (input.releaseType) {
      payload.push(`${MARKER.releaseType} ${input.releaseType}`);
    }
    const tracksJSON = JSON.stringify(
      input.tracks.map((track) => {
        const entry: Record<string, unknown> = {
          id: track.id,
          title: track.title,
          isExplicit: track.isExplicit
        };
        if (track.audioURL) entry.audioURL = track.audioURL;
        if (track.durationSeconds != null) entry.durationSeconds = track.durationSeconds;
        if (track.lyrics) entry.lyrics = track.lyrics;
        return entry;
      })
    );
    if (input.tracks.length) {
      payload.push(`${MARKER.tracks} ${encodeBase64Utf8(tracksJSON)}`);
    }
    const releaseDate = (input.releaseDate ?? "").trim();
    if (releaseDate) payload.push(`${MARKER.releaseDate} ${releaseDate}`);

    const label = (input.recordLabel ?? "").trim();
    if (label) payload.push(`${MARKER.recordLabel} ${label}`);

    const genre = (input.genre ?? "").trim();
    if (genre) payload.push(`${MARKER.genre} ${genre}`);

    const liner = (input.linerNotes ?? "").trim();
    if (liner) payload.push(`${MARKER.linerNotes} ${encodeBase64Utf8(liner)}`);
  }

  if (payload.length === 0) return head;
  return `${head} ${payload.join("\n")}`;
}
