"use client";

import { useEffect, useState } from "react";
import { PostCard } from "@/components/post/PostCard";
import { fetchAuthorPosts } from "@/lib/api/scrolls";
import { readFreshSession } from "@/lib/auth/session";
import type { ScrollsPost, ScrollsUser } from "@/lib/types/scrolls";

type Tab = "scrolls" | "rescrolls";

function isRescroll(post: ScrollsPost): boolean {
  return Boolean(post.rescrollOrigin ?? post.rescroll_origin);
}

/**
 * Renders a profile's posts, split into Scrolls and Rescrolls tabs (matching
 * iOS). `/posts/by-author` is an authed endpoint, so the server's anonymous
 * fetch can come back empty — this refetches with the signed-in viewer's token
 * on mount so a logged-in user always sees the author's posts.
 */
export function ProfilePosts({
  profile,
  initialPosts
}: {
  profile: ScrollsUser;
  initialPosts: ScrollsPost[];
}) {
  const [posts, setPosts] = useState<ScrollsPost[]>(initialPosts);
  const [tab, setTab] = useState<Tab>("scrolls");
  const [loading, setLoading] = useState(initialPosts.length === 0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const session = await readFreshSession();
      if (!session?.token) {
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        const loaded = await fetchAuthorPosts(profile.id, session.token);
        if (!cancelled && loaded.length) setPosts(loaded);
      } catch {
        // Keep whatever the server provided.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile.id]);

  const scrolls = posts.filter((post) => !isRescroll(post));
  const rescrolls = posts.filter(isRescroll);
  const visible = tab === "scrolls" ? scrolls : rescrolls;

  return (
    <div className="mt-8">
      <div className="mb-4 flex gap-2">
        {(["scrolls", "rescrolls"] as Tab[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`rounded-full px-4 py-2 text-sm font-black capitalize transition ${
              tab === value ? "bg-white text-black" : "border border-white/12 text-white/70 hover:bg-white/10"
            }`}
          >
            {value}
            {value === "scrolls" && scrolls.length ? ` ${scrolls.length}` : ""}
            {value === "rescrolls" && rescrolls.length ? ` ${rescrolls.length}` : ""}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-white/50">Loading posts…</p>
      ) : visible.length === 0 ? (
        <p className="text-white/50">
          {tab === "scrolls" ? `@${profile.username} hasn't posted any scrolls yet.` : "No rescrolls yet."}
        </p>
      ) : (
        <div className="space-y-6">
          {visible.map((post) => (
            <div key={post.id}>
              {isRescroll(post) ? (
                <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                  ↻ Rescrolled
                  {post.rescrollOrigin?.user?.username ? ` · @${post.rescrollOrigin.user.username}` : ""}
                </p>
              ) : null}
              <PostCard post={{ ...post, author: post.author ?? profile }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
