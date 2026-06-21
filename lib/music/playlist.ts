/**
 * Playlist feed posts. The backend `music-playlists` function creates a feed
 * post for each playlist whose caption carries `[MUSIC_PLAYLIST_BASE64]` with a
 * base64 JSON snapshot. The web decodes it to render a playlist card.
 */
export const PLAYLIST_MARKER = "[MUSIC_PLAYLIST_BASE64]";

export type PlaylistPostMeta = {
  playlistID: string;
  postID?: string | null;
  title: string;
  coverRef?: string | null;
  coverProvider?: string | null;
  coverBucket?: string | null;
  coverObjectKey?: string | null;
  trackCount?: number | null;
};

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

function firstNonEmptyLine(caption?: string | null): string | null {
  if (!caption) return null;
  for (const raw of caption.split(/\r?\n/)) {
    const line = raw.trim();
    if (line) return line;
  }
  return null;
}

export function isPlaylistPost(caption?: string | null): boolean {
  const first = firstNonEmptyLine(caption);
  return first ? first.toUpperCase().startsWith(PLAYLIST_MARKER) : false;
}

export function parsePlaylistPost(caption?: string | null): PlaylistPostMeta | null {
  if (!caption) return null;
  for (const raw of caption.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line.toUpperCase().startsWith(PLAYLIST_MARKER)) continue;
    const json = decodeBase64Utf8(line.slice(PLAYLIST_MARKER.length).trim());
    if (!json) continue;
    try {
      const obj = JSON.parse(json) as Record<string, unknown>;
      const playlistID = String(obj.playlistID ?? "");
      if (!playlistID) continue;
      return {
        playlistID,
        postID: obj.postID ? String(obj.postID) : null,
        title: String(obj.title ?? "Playlist"),
        coverRef: obj.coverRef ? String(obj.coverRef) : null,
        coverProvider: obj.coverProvider ? String(obj.coverProvider) : null,
        coverBucket: obj.coverBucket ? String(obj.coverBucket) : null,
        coverObjectKey: obj.coverObjectKey ? String(obj.coverObjectKey) : null,
        trackCount: typeof obj.trackCount === "number" ? obj.trackCount : null
      };
    } catch {
      continue;
    }
  }
  return null;
}
