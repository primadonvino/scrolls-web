import { ImageResponse } from "next/og";
import { fetchPost } from "@/lib/api/scrolls";
import { parseArticle } from "@/lib/article/article";
import { parseMusicPost, strippedCaption } from "@/lib/music/markers";

export const runtime = "edge";

type Params = { params: Promise<{ postId: string }> };

function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

/**
 * Branded Open Graph card for posts that have no shareable media (text posts,
 * or any post whose media can't be used). Referenced by the scroll page's
 * metadata as the og:image fallback.
 */
export async function GET(_request: Request, { params }: Params) {
  const { postId } = await params;
  let kind = "Scroll";
  let title = "Open this scroll on the web";
  let subtitle = "scrolls.adastra.love";

  try {
    const post = await fetchPost(postId);
    if (post) {
      const author = post.rescrollOrigin?.user ?? post.author ?? post.user;
      const handle = author?.username ? `@${author.username}` : "Scrolls";
      const music = parseMusicPost(post.caption);
      const article = parseArticle(post);
      if (music.isMusic || music.isPodcast) {
        kind = music.isPodcast ? "Podcast" : "Music";
        title = music.title ?? handle;
      } else if (article) {
        kind = "Article";
        title = article.headline;
      } else {
        kind = "Scroll";
        title = strippedCaption(post.caption ?? undefined)?.trim() || handle;
      }
      subtitle = `${handle} · scrolls.adastra.love`;
    }
  } catch {
    // Render the generic card below.
  }

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0b0b0d",
          padding: "72px",
          color: "white",
          fontFamily: "sans-serif"
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 32,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: "#d6b36c",
            fontWeight: 700
          }}
        >
          {kind} · Scrolls
        </div>
        <div style={{ display: "flex", fontSize: 72, fontWeight: 800, lineHeight: 1.05, maxWidth: 1040 }}>
          {truncate(title, 110)}
        </div>
        <div style={{ display: "flex", fontSize: 34, color: "rgba(255,255,255,0.6)" }}>{subtitle}</div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
