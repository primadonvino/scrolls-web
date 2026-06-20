/**
 * Featured music attached to a photo/video post. Byte-compatible with the iOS
 * `VideoFeaturedMusicLink` encoded behind `[FEATURED_MUSIC_BASE64]`, so music
 * attached on web shows up identically in the apps (and vice-versa).
 */
export const FEATURED_MUSIC_MARKER = "[FEATURED_MUSIC_BASE64]";
export const VIDEO_FEATURED_MUSIC_MARKER = "[VIDEO_FEATURED_MUSIC_BASE64]";

export type FeaturedMusicLink = {
  postID: string;
  trackID?: string | null;
  releaseTitle: string;
  trackTitle?: string | null;
  artistDisplayName: string;
  artistUsername: string;
};

function encodeBase64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function decodeBase64Utf8(b64: string): string | null {
  try {
    const binary = atob(b64.trim());
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

function isFeaturedMarker(upperLine: string): boolean {
  return upperLine.startsWith(FEATURED_MUSIC_MARKER) || upperLine.startsWith(VIDEO_FEATURED_MUSIC_MARKER);
}

/** Decodes the featured-music link from a caption, if present. */
export function parseFeaturedMusic(caption?: string | null): FeaturedMusicLink | null {
  if (!caption) return null;
  for (const raw of caption.split(/\r?\n/)) {
    const line = raw.trim();
    const upper = line.toUpperCase();
    const marker = upper.startsWith(FEATURED_MUSIC_MARKER)
      ? FEATURED_MUSIC_MARKER
      : upper.startsWith(VIDEO_FEATURED_MUSIC_MARKER)
        ? VIDEO_FEATURED_MUSIC_MARKER
        : null;
    if (!marker) continue;
    const json = decodeBase64Utf8(line.slice(marker.length).trim());
    if (!json) continue;
    try {
      const obj = JSON.parse(json) as Record<string, unknown>;
      const postID = String(obj.postID ?? "");
      if (!postID) continue;
      return {
        postID,
        trackID: obj.trackID ? String(obj.trackID) : null,
        releaseTitle: String(obj.releaseTitle ?? ""),
        trackTitle: obj.trackTitle ? String(obj.trackTitle) : null,
        artistDisplayName: String(obj.artistDisplayName ?? ""),
        artistUsername: String(obj.artistUsername ?? "")
      };
    } catch {
      continue;
    }
  }
  return null;
}

/** Removes any featured-music marker line from a caption. */
export function stripFeaturedMusicMarker(caption?: string | null): string {
  if (!caption) return "";
  return caption
    .split(/\r?\n/)
    .filter((line) => !isFeaturedMarker(line.trim().toUpperCase()))
    .join("\n")
    .trim();
}

/**
 * Prepends the `[FEATURED_MUSIC_BASE64]` marker to a caption (matching iOS
 * `captionWithFeaturedMusic`). A null link strips any existing marker.
 */
export function buildFeaturedMusicCaption(
  caption: string | null | undefined,
  link: FeaturedMusicLink | null
): string | null {
  const clean = stripFeaturedMusicMarker(caption);
  const lines: string[] = [];
  if (link) {
    const payload: FeaturedMusicLink = {
      postID: link.postID,
      releaseTitle: link.releaseTitle,
      artistDisplayName: link.artistDisplayName,
      artistUsername: link.artistUsername,
      ...(link.trackID ? { trackID: link.trackID } : {}),
      ...(link.trackTitle ? { trackTitle: link.trackTitle } : {})
    };
    lines.push(`${FEATURED_MUSIC_MARKER} ${encodeBase64Utf8(JSON.stringify(payload))}`);
  }
  if (clean) lines.push(clean);
  return lines.length ? lines.join("\n") : null;
}

export function featuredDisplayTitle(link: FeaturedMusicLink): string {
  const track = link.trackTitle?.trim();
  if (track) return track;
  const release = link.releaseTitle.trim();
  return release || "Featured music";
}

export function featuredDisplayArtist(link: FeaturedMusicLink): string {
  const name = link.artistDisplayName.trim();
  if (name) return name;
  const username = link.artistUsername.trim();
  return username ? `@${username}` : "Artist";
}
