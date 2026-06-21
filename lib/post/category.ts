import { isArticlePost } from "@/lib/article/article";
import { postMediaURL } from "@/lib/media/urls";
import { parseMusicPost } from "@/lib/music/markers";
import { isPlaylistPost } from "@/lib/music/playlist";
import type { ScrollsPost, ScrollsUser } from "@/lib/types/scrolls";
import { parseVideoCategory } from "@/lib/video/category";

/** Profile post-type filters, mirroring iOS `ProfileScrollFilter`. */
export type PostCategory =
  | "all"
  | "writing"
  | "drawings"
  | "photos"
  | "podcasts"
  | "video"
  | "videoPlain"
  | "shortFilm"
  | "musicVideo"
  | "music"
  | "musicAlbums"
  | "musicSingles"
  | "musicPlaylists"
  | "musicCollaborations";

export type CategoryLeaf = { value: PostCategory; label: string };
export type CategoryNode = CategoryLeaf | { label: string; children: CategoryLeaf[] };

/**
 * Two-level filter menu mirroring the iOS profile scroll filter: Video and
 * Music drill into submenus (the rest are flat), in the same order as iOS.
 */
export const POST_CATEGORY_MENU: CategoryNode[] = [
  { value: "all", label: "All Scrolls" },
  { value: "writing", label: "Writing" },
  { value: "drawings", label: "Drawings" },
  { value: "photos", label: "Photos" },
  { value: "podcasts", label: "Podcasts" },
  {
    label: "Video",
    children: [
      { value: "video", label: "All Video" },
      { value: "videoPlain", label: "Video" },
      { value: "shortFilm", label: "Short Film" },
      { value: "musicVideo", label: "Music Video" }
    ]
  },
  {
    label: "Music",
    children: [
      { value: "music", label: "All" },
      { value: "musicAlbums", label: "Albums" },
      { value: "musicSingles", label: "Singles/EPs" },
      { value: "musicPlaylists", label: "Playlists" },
      { value: "musicCollaborations", label: "Collaborations" }
    ]
  }
];

/**
 * True if `profile` is credited as a collaborator on any track of a music post.
 * Prefers userID match, falls back to case-insensitive username.
 */
export function postCreditsUser(post: ScrollsPost, profile?: ScrollsUser | null): boolean {
  if (!profile) return false;
  const music = parseMusicPost(post.caption);
  if (!music.isMusic) return false;
  const id = (profile.id ?? "").trim().toLowerCase();
  const username = (profile.username ?? "").trim().toLowerCase();
  return music.tracks.some((track) =>
    (track.collaboratorCredits ?? []).some((credit) => {
      if (id && credit.userID && credit.userID.trim().toLowerCase() === id) return true;
      if (username && credit.username && credit.username.trim().toLowerCase() === username) return true;
      return false;
    })
  );
}

/** Display label for a selected category value (used on the filter button). */
export function categoryLabel(value: PostCategory): string {
  for (const node of POST_CATEGORY_MENU) {
    if ("children" in node) {
      const child = node.children.find((leaf) => leaf.value === value);
      if (child) return `${node.label} · ${child.label}`;
    } else if (node.value === value) {
      return node.label;
    }
  }
  return "All Scrolls";
}

function isDrawing(post: ScrollsPost, type: string): boolean {
  if (type !== "photo") return false;
  const url = (postMediaURL(post) ?? "").toLowerCase();
  const name = url.split("?")[0].split("/").pop() ?? "";
  return url.includes("/drawings/") || name.startsWith("drawing-");
}

/**
 * True if the post belongs to the given profile filter category. `profile` is
 * the viewed profile, used for collaboration matching on the music filters.
 *
 * Note: this only sees the posts loaded for the profile (authored + rescrolls).
 * Surfacing collaboration releases *authored by other users* needs a backend
 * index (no endpoint queries the base64 collaboratorCredits in captions yet) —
 * the predicate is correct, so it will light up automatically once such posts
 * are in the set.
 */
export function postMatchesCategory(
  post: ScrollsPost,
  category: PostCategory,
  profile?: ScrollsUser | null
): boolean {
  if (category === "all") return true;
  const music = parseMusicPost(post.caption);
  const type = post.mediaPreview?.type ?? post.type ?? "";

  switch (category) {
    case "music":
      // Authored music releases plus any where the profile is a collaborator.
      return music.isMusic;
    case "musicCollaborations":
      return music.isMusic && postCreditsUser(post, profile);
    case "musicAlbums":
      return music.isMusic && music.releaseType === "album";
    case "musicSingles":
      return music.isMusic && music.releaseType === "singlesEPs";
    case "musicPlaylists":
      return isPlaylistPost(post.caption);
    case "podcasts":
      return music.isPodcast;
    case "video":
      return type === "video" && !music.isMusic;
    case "videoPlain":
      return type === "video" && !music.isMusic && parseVideoCategory(post.caption) === "video";
    case "shortFilm":
      return type === "video" && !music.isMusic && parseVideoCategory(post.caption) === "shortFilm";
    case "musicVideo":
      return type === "video" && !music.isMusic && parseVideoCategory(post.caption) === "musicVideo";
    case "drawings":
      return isDrawing(post, type);
    case "photos":
      return type === "photo" && !isDrawing(post, type);
    case "writing":
      return (
        !music.isMusic &&
        !music.isPodcast &&
        !isPlaylistPost(post.caption) &&
        (type === "text" || isArticlePost(post))
      );
    default:
      return true;
  }
}
