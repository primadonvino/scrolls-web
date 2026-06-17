import { parseArticle } from "@/lib/article/article";
import { normalizedAssetURL, postCoverURL, postMediaURL } from "@/lib/media/urls";
import { parseMusicPost } from "@/lib/music/markers";
import type { ScrollsPost } from "@/lib/types/scrolls";

const BASE = process.env.NEXT_PUBLIC_SCROLLS_WEB_BASE_URL ?? "https://scrolls.adastra.love";

/**
 * Builds schema.org JSON-LD for a post so search engines and rich-result
 * crawlers index its structured content — notably individual music track
 * titles (MusicAlbum/track), which are otherwise only inside the caption
 * markers. Returns null for post types without a useful schema.
 */
export function postJsonLd(post: ScrollsPost): Record<string, unknown> | null {
  const url = `${BASE}/scroll/${post.id}`;
  const author = post.rescrollOrigin?.user ?? post.author ?? post.user;
  const artistName = author?.displayName ?? author?.display_name ?? author?.username ?? "Scrolls";

  const music = parseMusicPost(post.caption);
  if (music.isMusic && music.tracks.length) {
    const cover = postCoverURL(post) ?? postMediaURL(post) ?? undefined;
    return {
      "@context": "https://schema.org",
      "@type": "MusicAlbum",
      name: music.title ?? `${artistName} on Scrolls`,
      url,
      albumReleaseType: music.releaseType === "album" ? "AlbumRelease" : "EPRelease",
      byArtist: { "@type": "MusicGroup", name: artistName },
      ...(music.genre ? { genre: music.genre } : {}),
      ...(music.recordLabel ? { recordLabel: { "@type": "Organization", name: music.recordLabel } } : {}),
      ...(music.releaseDate ? { datePublished: music.releaseDate } : {}),
      ...(cover ? { image: cover } : {}),
      numTracks: music.tracks.length,
      track: music.tracks.map((t, index) => ({
        "@type": "MusicRecording",
        position: index + 1,
        name: t.title,
        byArtist: { "@type": "MusicGroup", name: artistName }
      }))
    };
  }

  const article = parseArticle(post);
  if (article) {
    const cover = normalizedAssetURL(article.coverImageRef) ?? postCoverURL(post) ?? undefined;
    return {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: article.headline,
      url,
      author: { "@type": "Person", name: artistName },
      ...(cover ? { image: cover } : {}),
      ...(post.createdAt || post.created_at ? { datePublished: post.createdAt ?? post.created_at } : {}),
      description: article.blocks
        .map((b) => b.text)
        .join(" ")
        .slice(0, 280)
    };
  }

  return null;
}
