/** Total photos in a carousel, inclusive of the primary (mirrors iOS `carouselTotalCap`). */
export const CAROUSEL_TOTAL_CAP = 4;
/** Max extra photos beyond the primary. */
export const CAROUSEL_MAX_EXTRAS = CAROUSEL_TOTAL_CAP - 1;

const CAROUSEL_MARKER = "[PHOTO_CAROUSEL_BASE64]";

function encodeBase64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/**
 * Appends the `[PHOTO_CAROUSEL_BASE64]` marker carrying the extra photo URLs
 * (beyond the post's primary asset), byte-compatible with iOS
 * `FeedPost.photoCarouselCaption`. No extras → plain caption.
 */
export function buildCarouselCaption(caption: string | null | undefined, extraURLs: string[]): string | null {
  const base = (caption ?? "").trim();
  const urls = extraURLs.filter((url) => url && url.trim().length > 0);
  if (urls.length === 0) return base || null;
  const marker = `${CAROUSEL_MARKER} ${encodeBase64Utf8(JSON.stringify(urls))}`;
  return base ? `${base}\n${marker}` : marker;
}
