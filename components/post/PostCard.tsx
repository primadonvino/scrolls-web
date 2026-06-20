"use client";

import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { MediaRenderer } from "@/components/media/MediaRenderer";
import { ArticleCard } from "@/components/post/ArticleCard";
import { MusicCard } from "@/components/post/MusicCard";
import { PhotoCarousel } from "@/components/post/PhotoCarousel";
import { PostActions } from "@/components/post/PostActions";
import { UserBadges } from "@/components/UserBadges";
import { isArticlePost } from "@/lib/article/article";
import { postMediaURL } from "@/lib/media/urls";
import { featuredDisplayArtist, featuredDisplayTitle, parseFeaturedMusic } from "@/lib/music/featured";
import { isMusicOrPodcast, photoCarouselURLs, strippedCaption } from "@/lib/music/markers";
import { parseVideoCategory, videoCategoryLabel } from "@/lib/video/category";
import type { ScrollsPost } from "@/lib/types/scrolls";

export function PostCard({
  post,
  onBlocked,
  onDeleted
}: {
  post: ScrollsPost;
  onBlocked?: (userID: string) => void;
  onDeleted?: (postID: string) => void;
}) {
  // For a rescroll, post.author is the rescroller; the real author of the
  // content is rescrollOrigin.user (matches iOS `rescrollOrigin?.user ?? user`).
  const rescroll = post.rescrollOrigin ?? post.rescroll_origin ?? null;
  const rescroller = rescroll ? post.author ?? post.user : null;
  const quoteText = (post.quoteText ?? post.quote_text ?? "").trim();
  const author = rescroll?.user ?? post.author ?? post.user;
  const displayName = author?.displayName ?? author?.display_name ?? author?.username ?? "Scrolls user";
  const username = author?.username ?? "user";
  const [caption, setCaption] = useState(post.caption ?? "");
  const isMusic = isMusicOrPodcast(post);
  const isArticle = !isMusic && isArticlePost(post);
  const isVideo = !isMusic && !isArticle && (post.mediaPreview?.type ?? post.type) === "video";
  const videoLabel = isVideo ? videoCategoryLabel(parseVideoCategory(post.caption)) : null;
  const featured = !isMusic && !isArticle ? parseFeaturedMusic(post.caption) : null;
  const displayCaption = strippedCaption(caption);
  const carouselExtras = !isMusic && !isArticle ? photoCarouselURLs(post.caption) : [];
  const carouselImages = carouselExtras.length
    ? ([postMediaURL(post), ...carouselExtras].filter(Boolean) as string[])
    : [];
  const isCarousel = carouselImages.length > 1;

  return (
    <article className="scrolls-glass relative rounded-[1.8rem] p-4 has-[details[open]]:z-30">
      {rescroller ? (
        <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-white/45">
          <span aria-hidden>↻</span>
          <span>Rescrolled by</span>
          <Link href={`/user/${encodeURIComponent(rescroller.username ?? "user")}`} className="hover:underline">
            @{rescroller.username ?? "user"}
          </Link>
        </div>
      ) : null}
      {quoteText ? (
        <div className="mb-4 rounded-2xl border border-scrolls-blue/25 bg-white/[0.03] p-4">
          {rescroller?.username ? (
            <p className="mb-1 text-sm font-bold text-white/55">@{rescroller.username}</p>
          ) : null}
          <p className="whitespace-pre-wrap text-[15px] font-semibold leading-relaxed text-white/90">{quoteText}</p>
        </div>
      ) : null}
      <Link href={`/user/${encodeURIComponent(username)}`} className="mb-4 flex items-center gap-3">
        <Avatar user={author} size={44} />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-bold">{displayName}</span>
            <UserBadges user={author} size={15} />
          </div>
          <div className="truncate text-sm text-white/55">@{username}</div>
        </div>
      </Link>
      {isMusic ? (
        <MusicCard post={post} />
      ) : isArticle ? (
        <ArticleCard post={post} />
      ) : isCarousel ? (
        <PhotoCarousel images={carouselImages} alt={displayCaption ?? undefined} />
      ) : (
        <Link href={`/scroll/${post.id}`} className="block">
          <MediaRenderer post={post} />
        </Link>
      )}
      {videoLabel ? (
        <span className="mt-3 inline-block rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-xs font-bold uppercase tracking-wide text-scrolls-gold">
          {videoLabel}
        </span>
      ) : null}
      {featured ? (
        <Link
          href={`/scroll/${encodeURIComponent(featured.postID)}`}
          className="mt-3 flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-3 py-2 text-sm transition hover:bg-white/10"
        >
          <span className="text-scrolls-gold">♪</span>
          <span className="min-w-0 truncate font-bold text-white/85">{featuredDisplayTitle(featured)}</span>
          <span className="shrink-0 text-white/45">· {featuredDisplayArtist(featured)}</span>
        </Link>
      ) : null}
      {!isMusic && !isArticle && displayCaption ? (
        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-white/85">{displayCaption}</p>
      ) : null}
      <PostActions
        post={post}
        onBlocked={onBlocked}
        onDeleted={onDeleted}
        onCaptionUpdated={(_, next) => setCaption(next)}
      />
      <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-xs text-white/45">
        <span>{post.locationCity ?? post.location_city ?? ""}</span>
        <Link href={`/scroll/${post.id}`} className="font-semibold text-white/75">Open scroll</Link>
      </div>
    </article>
  );
}
