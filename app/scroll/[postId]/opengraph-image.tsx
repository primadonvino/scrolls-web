import { ImageResponse } from "next/og";
import { fetchPost } from "@/lib/api/scrolls";
import { parseArticle } from "@/lib/article/article";
import { parsePlaylistPost } from "@/lib/music/playlist";
import { playlistCoverURL, postCoverURL, postMediaURL, userAvatarURL } from "@/lib/media/urls";
import { parseMusicPost, strippedCaption } from "@/lib/music/markers";
import { loadRemoteImage } from "@/lib/og/remoteImage";

export const runtime = "edge";
export const alt = "Scrolls post";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

export default async function Image({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  let kind = "Scroll";
  let title = "Open this scroll on the web";
  let handle = "scrolls.adastra.love";
  let mediaURL: string | null = null;
  let avatarURL: string | null = null;

  try {
    const post = await fetchPost(postId);
    if (post) {
      const author = post.rescrollOrigin?.user ?? post.author ?? post.user;
      handle = author?.username ? `@${author.username}` : "Scrolls";
      const avatar = userAvatarURL(author);
      // Only remote avatars load in the edge runtime (skip the /icon.png fallback).
      avatarURL = avatar && /^https?:\/\//.test(avatar) ? avatar : null;
      const playlist = parsePlaylistPost(post.caption);
      const music = parseMusicPost(post.caption);
      const article = parseArticle(post);
      if (playlist) {
        kind = "Playlist";
        title = playlist.title;
      } else if (music.isMusic || music.isPodcast) {
        kind = music.isPodcast ? "Podcast" : "Music";
        title = music.title ?? handle;
      } else if (article) {
        kind = "Article";
        title = article.headline;
      } else {
        kind = "Scroll";
        title = strippedCaption(post.caption ?? undefined)?.trim() || handle;
      }
      mediaURL = (playlist ? playlistCoverURL(playlist) : null) ?? postCoverURL(post) ?? postMediaURL(post) ?? null;
    }
  } catch {
    // Render the generic card.
  }

  const [dataURL, avatarData] = await Promise.all([loadRemoteImage(mediaURL), loadRemoteImage(avatarURL)]);

  return new ImageResponse(
    (
      <div style={{ height: "100%", width: "100%", display: "flex", position: "relative", background: "#0b0b0d", fontFamily: "sans-serif" }}>
        {dataURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dataURL} width={1200} height={630} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
        ) : null}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "64px",
            // Subtle gold inset border + readability gradient over media.
            boxShadow: "inset 0 0 0 3px rgba(214,179,108,0.45)",
            background: dataURL
              ? "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0.85) 100%)"
              : "transparent",
            color: "white"
          }}
        >
          <div style={{ display: "flex", fontSize: 30, letterSpacing: 6, textTransform: "uppercase", color: "#d6b36c", fontWeight: 700 }}>
            {kind} · Scrolls
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", fontSize: dataURL ? 60 : 70, fontWeight: 800, lineHeight: 1.05, maxWidth: 1040 }}>
              {truncate(title, 110)}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {avatarData ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarData}
                  width={52}
                  height={52}
                  style={{ width: 52, height: 52, borderRadius: 52, objectFit: "cover", border: "2px solid rgba(214,179,108,0.6)" }}
                  alt=""
                />
              ) : null}
              <div style={{ display: "flex", fontSize: 32, color: "rgba(255,255,255,0.7)" }}>{handle} · scrolls.adastra.love</div>
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
