"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { SponsoredCard } from "@/components/ads/SponsoredCard";
import { PostCard } from "@/components/post/PostCard";
import { SiteHeader } from "@/components/SiteHeader";
import { hasSubscriberBenefits } from "@/lib/account/entitlements";
import { fetchAdDelivery, fetchCityPosts, fetchFeed } from "@/lib/api/scrolls";
import { readFreshSession } from "@/lib/auth/session";
import { browserSupabaseClient, setRealtimeAuth, type ScrollsRealtimeChannel } from "@/lib/realtime/supabase";
import type { AdDeliveryItem, ScrollsPost, ScrollsUser } from "@/lib/types/scrolls";

export default function FeedPage() {
  const [posts, setPosts] = useState<ScrollsPost[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [adItems, setAdItems] = useState<AdDeliveryItem[]>([]);
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
      if (session?.token && !isAdFreeUser(session.user)) {
        try {
          const delivery = await fetchAdDelivery(city, session.token, 6);
          setAdItems(delivery);
        } catch {
          setAdItems([]);
        }
      } else {
        setAdItems([]);
      }
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

  // Optimistically show a rescroll/quote at the top the instant it's posted —
  // mirrors iOS `posts.insert(sharedPost, at: 0)`. The backend feed orders your
  // own content after people you follow, so without this it wouldn't appear up
  // top right after posting.
  useEffect(() => {
    function onRescrolled(event: Event) {
      const detail = (event as CustomEvent<ScrollsPost>).detail;
      if (!detail) return;
      setPosts((current) => {
        const key = rescrollKey(detail);
        const deduped = current.filter((post) => post.id !== detail.id && (!key || rescrollKey(post) !== key));
        return [detail, ...deduped];
      });
    }
    window.addEventListener("scrolls:rescrolled", onRescrolled as EventListener);
    return () => window.removeEventListener("scrolls:rescrolled", onRescrolled as EventListener);
  }, []);

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
        <div className="mb-6 flex justify-center">
          <details className="group relative">
            <summary className="flex cursor-pointer list-none items-center justify-center gap-2">
              {selectedCity ? (
                <span className="text-4xl font-black">{selectedCity}</span>
              ) : (
                <span className="scrolls-wordmark text-5xl leading-none text-white">Scrolls</span>
              )}
              <span className="text-2xl text-white/40 transition group-open:rotate-180">⌄</span>
            </summary>
            <div className="absolute left-1/2 z-30 mt-2 w-56 -translate-x-1/2 overflow-hidden rounded-2xl border border-white/10 bg-[#171719] p-1 shadow-glow">
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
        </div>
        {loading ? <p className="rounded-2xl bg-white/[0.04] p-5 text-white/60">Loading feed...</p> : null}
        {error ? <p className="rounded-2xl border border-red-400/30 bg-red-500/10 p-5 text-red-200">{error}</p> : null}
        <div className="space-y-6">
          {posts.map((post, index) => {
            const ad = adForIndex(index, adItems);
            return (
              <Fragment key={post.id}>
                <PostCard post={post} onBlocked={removeBlockedAuthor} onDeleted={removeDeletedPost} />
                {ad ? <SponsoredCard item={ad} /> : null}
              </Fragment>
            );
          })}
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

function adForIndex(index: number, ads: AdDeliveryItem[]) {
  if (!ads.length) return null;
  // Keep ads readable and sparse: first card after the third post, then every
  // seven posts after that. This mirrors the iOS "sponsored cards in feed"
  // rhythm without overwhelming the web feed.
  if (index < 2) return null;
  if ((index - 2) % 7 !== 0) return null;
  const adIndex = Math.floor((index - 2) / 7) % ads.length;
  return ads[adIndex] ?? null;
}

function isAdFreeUser(user?: ScrollsUser | null) {
  // Ad-free is a Blue (verified) benefit on iOS — anyone above the free tier.
  return hasSubscriberBenefits(user);
}

function rescrollKey(post: ScrollsPost): string | null {
  const origin = post.rescrollOrigin?.postID ?? post.rescroll_origin?.postID;
  if (!origin) return null;
  const actor = (post.author?.id ?? post.user?.id ?? "").toLowerCase();
  return `${actor}:${origin.toLowerCase()}`;
}

function mergeFreshPosts(fresh: ScrollsPost[], current: ScrollsPost[]) {
  // Drop optimistic temp rescrolls once the server returns the real one for the
  // same actor + original post, so we don't show a duplicate.
  const freshRescrollKeys = new Set(fresh.map(rescrollKey).filter(Boolean) as string[]);
  const pruned = current.filter(
    (post) => !(post.id.startsWith("rescroll-temp-") && freshRescrollKeys.has(rescrollKey(post) ?? ""))
  );
  if (!pruned.length) return fresh;
  const freshIDs = new Set(fresh.map((post) => post.id));
  const olderCurrent = pruned.filter((post) => !freshIDs.has(post.id));
  return [...fresh, ...olderCurrent].slice(0, Math.max(pruned.length, fresh.length));
}
