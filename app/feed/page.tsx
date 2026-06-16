"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PostCard } from "@/components/post/PostCard";
import { SiteHeader } from "@/components/SiteHeader";
import { fetchFeed } from "@/lib/api/scrolls";
import { readSession } from "@/lib/auth/session";
import type { ScrollsPost } from "@/lib/types/scrolls";

export default function FeedPage() {
  const [posts, setPosts] = useState<ScrollsPost[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const session = readSession();
    fetchFeed(session?.token, session?.user?.id)
      .then((result) => {
        if (!cancelled) setPosts(result.posts);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load feed.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <SiteHeader />
      <section className="mx-auto max-w-2xl px-5 pb-16">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-4xl font-black">Feed</h1>
            <p className="mt-2 text-white/55">A first web slice of the Scrolls timeline.</p>
          </div>
          <Link href="/login" className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/75">Log in</Link>
        </div>
        {loading ? <p className="rounded-2xl bg-white/[0.04] p-5 text-white/60">Loading feed...</p> : null}
        {error ? <p className="rounded-2xl border border-red-400/30 bg-red-500/10 p-5 text-red-200">{error}</p> : null}
        <div className="space-y-6">
          {posts.map((post) => <PostCard key={post.id} post={post} />)}
        </div>
      </section>
    </div>
  );
}
