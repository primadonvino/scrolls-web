"use client";

import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { MediaRenderer } from "@/components/media/MediaRenderer";
import { PostActions } from "@/components/post/PostActions";
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
  const author = post.author ?? post.user;
  const displayName = author?.displayName ?? author?.display_name ?? author?.username ?? "Scrolls user";
  const username = author?.username ?? "user";
  const [caption, setCaption] = useState(post.caption ?? "");

  return (
    <article className="scrolls-glass rounded-[1.8rem] p-4">
      <Link href={`/user/${encodeURIComponent(username)}`} className="mb-4 flex items-center gap-3">
        <Avatar user={author} size={44} />
        <div className="min-w-0">
          <div className="truncate font-bold">{displayName}</div>
          <div className="truncate text-sm text-white/55">@{username}</div>
        </div>
      </Link>
      <Link href={`/scroll/${post.id}`} className="block">
        <MediaRenderer post={post} />
      </Link>
      {caption ? (
        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-white/85">{caption}</p>
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
