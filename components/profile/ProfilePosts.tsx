"use client";

import { useEffect, useState } from "react";
import { PostCard } from "@/components/post/PostCard";
import { fetchAuthorPosts } from "@/lib/api/scrolls";
import { readFreshSession } from "@/lib/auth/session";
import { categoryLabel, POST_CATEGORY_MENU, postMatchesCategory, type PostCategory } from "@/lib/post/category";
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
  initialPosts,
  pinnedPostId
}: {
  profile: ScrollsUser;
  initialPosts: ScrollsPost[];
  pinnedPostId?: string;
}) {
  const [posts, setPosts] = useState<ScrollsPost[]>(initialPosts);
  const [tab, setTab] = useState<Tab>("scrolls");
  const [category, setCategory] = useState<PostCategory>("all");
  const [openSection, setOpenSection] = useState<string | null>(null);
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

  const shown = pinnedPostId ? posts.filter((post) => post.id !== pinnedPostId) : posts;
  const scrolls = shown.filter((post) => !isRescroll(post));
  const rescrolls = shown.filter(isRescroll);
  const tabList = tab === "scrolls" ? scrolls : rescrolls;
  const visible = category === "all" ? tabList : tabList.filter((post) => postMatchesCategory(post, category));
  const activeLabel = categoryLabel(category);

  function selectCategory(value: PostCategory, target: HTMLElement) {
    setCategory(value);
    target.closest("details")?.removeAttribute("open");
  }

  return (
    <div className="mt-8">
      <div className="mb-4 flex flex-wrap items-center gap-2">
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

        <details className="group relative ml-auto">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-full border border-white/12 px-4 py-2 text-sm font-bold text-white/80 transition hover:bg-white/10">
            {activeLabel}
            <span className="text-white/40 transition group-open:rotate-180">⌄</span>
          </summary>
          <div className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-2xl border border-white/10 bg-scrolls-panel p-1 shadow-glow">
            {POST_CATEGORY_MENU.map((node) => {
              if (!("children" in node)) {
                return (
                  <button
                    key={node.value}
                    type="button"
                    onClick={(event) => selectCategory(node.value, event.currentTarget)}
                    className={`block w-full rounded-xl px-4 py-2.5 text-left text-sm font-bold transition hover:bg-white/10 ${
                      category === node.value ? "text-scrolls-gold" : "text-white/85"
                    }`}
                  >
                    {category === node.value ? "✓ " : ""}
                    {node.label}
                  </button>
                );
              }
              const expanded = openSection === node.label || node.children.some((leaf) => leaf.value === category);
              return (
                <div key={node.label}>
                  <button
                    type="button"
                    onClick={() => setOpenSection((current) => (current === node.label ? null : node.label))}
                    className="flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-left text-sm font-bold text-white/85 transition hover:bg-white/10"
                  >
                    {node.label}
                    <span className={`text-white/40 transition ${expanded ? "rotate-180" : ""}`}>⌄</span>
                  </button>
                  {expanded
                    ? node.children.map((leaf) => (
                        <button
                          key={leaf.value}
                          type="button"
                          onClick={(event) => selectCategory(leaf.value, event.currentTarget)}
                          className={`block w-full rounded-xl py-2 pl-8 pr-4 text-left text-sm font-bold transition hover:bg-white/10 ${
                            category === leaf.value ? "text-scrolls-gold" : "text-white/75"
                          }`}
                        >
                          {category === leaf.value ? "✓ " : ""}
                          {leaf.label}
                        </button>
                      ))
                    : null}
                </div>
              );
            })}
          </div>
        </details>
      </div>

      {loading ? (
        <p className="text-white/50">Loading posts…</p>
      ) : visible.length === 0 ? (
        <p className="text-white/50">
          {category !== "all"
            ? `No ${activeLabel.toLowerCase()} here.`
            : tab === "scrolls"
              ? `@${profile.username} hasn't posted any scrolls yet.`
              : "No rescrolls yet."}
        </p>
      ) : (
        <div className="space-y-6">
          {visible.map((post) => (
            <PostCard key={post.id} post={{ ...post, author: post.author ?? profile }} />
          ))}
        </div>
      )}
    </div>
  );
}
