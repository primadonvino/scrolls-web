/**
 * Video post categories — mirrors the music release-type scheme: a marker line
 * in the caption tags the video as a short film or music video. A plain video
 * carries no marker. Kept byte-compatible with the iOS `[VIDEO_CATEGORY]`
 * caption marker so videos categorized on web parse identically in the app.
 *
 * Parsing is deliberately lenient (accepts camelCase, snake_case, and spaced
 * spellings) so it reads whatever casing the iOS/Android apps emit; writing
 * always uses the camelCase `shortFilm` / `musicVideo` values.
 */
export const VIDEO_CATEGORY_MARKER = "[VIDEO_CATEGORY]";

export type VideoCategory = "video" | "shortFilm" | "musicVideo";

export const VIDEO_CATEGORY_OPTIONS: { value: VideoCategory; label: string }[] = [
  { value: "video", label: "Video" },
  { value: "shortFilm", label: "Short film" },
  { value: "musicVideo", label: "Music video" }
];

/** The category tagged in a video post's caption, defaulting to a plain video. */
export function parseVideoCategory(caption?: string | null): VideoCategory {
  if (!caption) return "video";
  for (const line of caption.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.toUpperCase().startsWith(VIDEO_CATEGORY_MARKER)) continue;
    const value = trimmed.slice(VIDEO_CATEGORY_MARKER.length).trim().toLowerCase().replace(/[\s_]/g, "");
    if (value === "shortfilm") return "shortFilm";
    if (value === "musicvideo") return "musicVideo";
    return "video";
  }
  return "video";
}

/** Appends the `[VIDEO_CATEGORY]` marker to a caption (none for a plain video). */
export function buildVideoCaption(caption: string | null | undefined, category: VideoCategory): string | null {
  const base = (caption ?? "").trim();
  if (category === "video") return base || null;
  const marker = `${VIDEO_CATEGORY_MARKER} ${category}`;
  return base ? `${base}\n${marker}` : marker;
}

/** Human label for a non-plain category (used as a badge); null for plain video. */
export function videoCategoryLabel(category: VideoCategory): string | null {
  if (category === "shortFilm") return "Short Film";
  if (category === "musicVideo") return "Music Video";
  return null;
}
