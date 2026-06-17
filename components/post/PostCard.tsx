"use client";

import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { MediaRenderer } from "@/components/media/MediaRenderer";
import { ArticleCard } from "@/components/post/ArticleCard";
import { MusicCard } from "@/components/post/MusicCard";
import { PostActions } from "@/components/post/PostActions";
import { UserBadges } from "@/components/UserBadges";
import { isArticlePost } from "@/lib/article/article";
import { isMusicOrPodcast, strippedCaption } from "@/lib/music/markers";
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
  const author = rescroll?.user ?? post.author ?? post.user;
  const displayName = author?.displayName ?? author?.display_name ?? author?.username ?? "Scrolls user";
  const username = author?.username ?? "user";
  const [caption, setCaption] = useState(post.caption ?? "");
  const isMusic = isMusicOrPodcast(post);
  const isArticle = !isMusic && isArticlePost(post);
  const displayCaption = strippedCaption(caption);

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
      ) : (
        <Link href={`/scroll/${post.id}`} className="block">
          <MediaRenderer post={post} />
        </Link>
      )}
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
