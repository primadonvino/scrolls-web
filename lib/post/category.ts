import { isArticlePost } from "@/lib/article/article";
import { postMediaURL } from "@/lib/media/urls";
import { parseMusicPost } from "@/lib/music/markers";
import type { ScrollsPost } from "@/lib/types/scrolls";

/** Profile post-type filters, mirroring iOS `ProfileScrollFilter`. */
export type PostCategory = "all" | "writing" | "drawings" | "photos" | "video" | "podcasts" | "music";

export const POST_CATEGORIES: { value: PostCategory; label: string }[] = [
  { value: "all", label: "All Scrolls" },
  { value: "writing", label: "Writing" },
  { value: "drawings", label: "Drawings" },
  { value: "photos", label: "Photos" },
  { value: "video", label: "Video" },
  { value: "podcasts", label: "Podcasts" },
  { value: "music", label: "Music" }
];

function isDrawing(post: ScrollsPost, type: string): boolean {
  if (type !== "photo") return false;
  const url = (postMediaURL(post) ?? "").toLowerCase();
  const name = url.split("?")[0].split("/").pop() ?? "";
  return url.includes("/drawings/") || name.startsWith("drawing-");
}

/** True if the post belongs to the given profile filter category. */
export function postMatchesCategory(post: ScrollsPost, category: PostCategory): boolean {
  if (category === "all") return true;
  const music = parseMusicPost(post.caption);
  const type = post.mediaPreview?.type ?? post.type ?? "";

  switch (category) {
    case "music":
      return music.isMusic;
    case "podcasts":
      return music.isPodcast;
    case "video":
      return type === "video" && !music.isMusic;
    case "drawings":
      return isDrawing(post, type);
    case "photos":
      return type === "photo" && !isDrawing(post, type);
    case "writing":
      return !music.isMusic && !music.isPodcast && (type === "text" || isArticlePost(post));
    default:
      return true;
  }
}
