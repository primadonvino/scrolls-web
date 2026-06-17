"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { PostCard } from "@/components/post/PostCard";
import { SiteHeader } from "@/components/SiteHeader";
import { fetchCityPosts, fetchFeed } from "@/lib/api/scrolls";
import { readFreshSession } from "@/lib/auth/session";
import { browserSupabaseClient, setRealtimeAuth, type ScrollsRealtimeChannel } from "@/lib/realtime/supabase";
import type { ScrollsPost } from "@/lib/types/scrolls";

export default function FeedPage() {
  const [posts, setPosts] = useState<ScrollsPost[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  // Feed scope: null = home "Scrolls" feed, otherwise a city name. Mirrors the
  // iOS/Android feed-header city selector.
  const [homeCity, setHomeCity] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const selectedCityRef = useRef<string | null>(null);

  const refreshFeed = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const session = await readFreshSession();
      const city = selectedCityRef.current;
      const result = city
        ? await fetchCityPosts(city, session?.token)
        : await fetchFeed(session?.token, session?.user?.id);
      setPosts((current) => mergeFreshPosts(result.posts, current));
      setNextCursor(result.nextCursor);
      setError(null);
    } catch (err) {
      if (!silent) setError(err instanceof Error ? err.message : "Could not load feed.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const selectCity = useCallback(
    (city: string | null) => {
      selectedCityRef.current = city;
      setSelectedCity(city);
      setPosts([]);
      setNextCursor(null);
      refreshFeed();
    },
    [refreshFeed]
  );

  useEffect(() => {
    readFreshSession().then((session) => {
      setHomeCity(session?.user?.homeCity ?? session?.user?.home_city ?? null);
    });
    refreshFeed();
  }, [refreshFeed]);

  useEffect(() => {
    let cancelled = false;
    let channel: ScrollsRealtimeChannel | null = null;
    const interval = window.setInterval(() => refreshFeed(true), 60_000);

    (async () => {
      const session = await readFreshSession();
      if (!session?.token || !session.user?.id || cancelled) return;
      const supabase = setRealtimeAuth(session.token);
      if (!supabase) return;
      channel = supabase
        .channel(`scrolls-web-feed-${session.user.id}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => refreshFeed(true))
        .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, () => refreshFeed(true))
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "follows", filter: `follower_id=eq.${session.user.id}` },
          () => refreshFeed(true)
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      const supabase = browserSupabaseClient();
      if (channel && supabase) supabase.removeChannel(channel);
    };
  }, [refreshFeed]);

  function removeBlockedAuthor(userID: string) {
    setPosts((current) => current.filter((post) => {
      const author = post.author ?? post.user;
      return author?.id !== userID;
    }));
  }

  function removeDeletedPost(postID: string) {
    setPosts((current) => current.filter((post) => post.id !== postID));
  }

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const session = await readFreshSession();
      const result = await fetchFeed(session?.token, session?.user?.id, nextCursor);
      setPosts((current) => [...current, ...result.posts]);
      setNextCursor(result.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load more posts.");
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore]);

  // Auto-load the next page when the sentinel scrolls into view.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !nextCursor) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "600px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [nextCursor, loadMore]);

  return (
    <div>
      <SiteHeader />
      <section className="mx-auto max-w-2xl px-5 pb-16">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <details className="group relative">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-4xl font-black">
              {selectedCity ?? "Scrolls"}
              <span className="text-2xl text-white/40 transition group-open:rotate-180">⌄</span>
            </summary>
            <div className="absolute left-0 z-30 mt-2 w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#171719] p-1 shadow-glow">
              <button
                type="button"
                onClick={() => selectCity(null)}
                className={`block w-full rounded-xl px-4 py-2.5 text-left text-sm font-bold transition hover:bg-white/10 ${
                  selectedCity === null ? "text-scrolls-gold" : "text-white/85"
                }`}
              >
                Scrolls
              </button>
              {homeCity ? (
                <button
                  type="button"
                  onClick={() => selectCity(homeCity)}
                  className={`block w-full rounded-xl px-4 py-2.5 text-left text-sm font-bold transition hover:bg-white/10 ${
                    selectedCity === homeCity ? "text-scrolls-gold" : "text-white/85"
                  }`}
                >
                  {homeCity}
                </button>
              ) : (
                <p className="px-4 py-2.5 text-xs text-white/40">Set a home city in the app to see a city feed.</p>
              )}
            </div>
          </details>
          <div className="flex gap-2">
            <Link href="/compose" className="rounded-full bg-white px-4 py-2 text-sm font-black text-black">Create</Link>
            <Link href="/circles" className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/75">Circles</Link>
          </div>
        </div>
        {loading ? <p className="rounded-2xl bg-white/[0.04] p-5 text-white/60">Loading feed...</p> : null}
        {error ? <p className="rounded-2xl border border-red-400/30 bg-red-500/10 p-5 text-red-200">{error}</p> : null}
        <div className="space-y-6">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onBlocked={removeBlockedAuthor} onDeleted={removeDeletedPost} />
          ))}
        </div>
        {nextCursor ? (
          <div ref={sentinelRef} className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="rounded-full border border-white/15 px-6 py-3 text-sm font-black text-white/85 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loadingMore ? "Loading..." : "Load more"}
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function mergeFreshPosts(fresh: ScrollsPost[], current: ScrollsPost[]) {
  if (!current.length) return fresh;
  const freshIDs = new Set(fresh.map((post) => post.id));
  const olderCurrent = current.filter((post) => !freshIDs.has(post.id));
  return [...fresh, ...olderCurrent].slice(0, Math.max(current.length, fresh.length));
}
