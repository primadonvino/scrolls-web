"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { SiteHeader } from "@/components/SiteHeader";
import { UserBadges } from "@/components/UserBadges";
import { searchPosts, searchUsers } from "@/lib/api/scrolls";
import { readFreshSession } from "@/lib/auth/session";
import { parseArticle } from "@/lib/article/article";
import { postCoverURL, postMediaURL } from "@/lib/media/urls";
import { parseMusicPost, strippedCaption } from "@/lib/music/markers";
import type { ScrollsPost, ScrollsUser } from "@/lib/types/scrolls";

function authorName(post: ScrollsPost): string {
  const a = post.author ?? post.user;
  return a?.displayName ?? a?.display_name ?? a?.username ?? "Scrolls";
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<ScrollsUser[]>([]);
  const [posts, setPosts] = useState<ScrollsPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (debounce.current) clearTimeout(debounce.current);
    if (trimmed.length < 2) {
      setUsers([]);
      setPosts([]);
      setSearched(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounce.current = setTimeout(async () => {
      setError(null);
      try {
        const session = await readFreshSession();
        const [userResults, postResults] = await Promise.all([
          searchUsers(trimmed, session?.token).catch(() => []),
          searchPosts(trimmed, session?.token).catch(() => ({ relevant: [], recent: [] }))
        ]);
        setUsers(Array.isArray(userResults) ? userResults : []);
        const merged = [...(postResults.relevant ?? []), ...(postResults.recent ?? [])];
        setPosts(Array.from(new Map(merged.map((post) => [post.id, post])).values()));
        setSearched(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search failed.");
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query]);

  // Categorize posts the way iOS does: Articles, Music, Podcasts, then Scrolls.
  const { articles, music, podcasts, scrolls } = useMemo(() => {
    const articles: ScrollsPost[] = [];
    const music: ScrollsPost[] = [];
    const podcasts: ScrollsPost[] = [];
    const scrolls: ScrollsPost[] = [];
    for (const post of posts) {
      const m = parseMusicPost(post.caption);
      if (m.isPodcast) podcasts.push(post);
      else if (m.isMusic) music.push(post);
      else if (parseArticle(post)) articles.push(post);
      else scrolls.push(post);
    }
    return { articles, music, podcasts, scrolls };
  }, [posts]);

  const empty = searched && !users.length && !posts.length;

  return (
    <div>
      <SiteHeader />
      <section className="mx-auto max-w-2xl px-5 pb-28">
        <div className="mb-5">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-scrolls-gold">Search</p>
          <h1 className="mt-2 text-4xl font-black">Find people &amp; scrolls</h1>
        </div>

        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search Scrolls, users, or keywords"
          autoFocus
          className="w-full rounded-full border border-white/12 bg-black px-5 py-3 text-base text-white outline-none placeholder:text-white/30 focus:border-white/30"
        />

        {error ? <p className="mt-5 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-red-200">{error}</p> : null}
        {loading ? <p className="mt-5 text-white/55">Searching…</p> : null}
        {empty ? <p className="mt-5 text-white/50">No matches for &ldquo;{query.trim()}&rdquo;.</p> : null}

        <div className="mt-6 space-y-8">
          {users.length ? (
            <Section title="Creators">
              <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
                {users.map((user) => (
                  <Link
                    key={user.id}
                    href={`/user/${encodeURIComponent(user.username)}`}
                    className="flex w-24 shrink-0 flex-col items-center gap-2 text-center"
                  >
                    <Avatar user={user} size={64} />
                    <div className="min-w-0">
                      <div className="flex items-center justify-center gap-1">
                        <span className="truncate text-xs font-bold text-white">
                          {user.displayName ?? user.display_name ?? user.username}
                        </span>
                        <UserBadges user={user} size={12} />
                      </div>
                      <p className="truncate text-[11px] text-white/45">@{user.username}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </Section>
          ) : null}

          {articles.length ? (
            <Section title="Articles">
              <div className="space-y-2">
                {articles.map((post) => (
                  <ListRow key={post.id} post={post} label="Article" title={parseArticle(post)?.headline ?? "Article"} />
                ))}
              </div>
            </Section>
          ) : null}

          {music.length ? (
            <Section title="Music">
              <div className="space-y-2">
                {music.map((post) => (
                  <ListRow key={post.id} post={post} label="Music" title={parseMusicPost(post.caption).title ?? "Music release"} />
                ))}
              </div>
            </Section>
          ) : null}

          {podcasts.length ? (
            <Section title="Podcasts">
              <div className="space-y-2">
                {podcasts.map((post) => (
                  <ListRow key={post.id} post={post} label="Podcast" title={parseMusicPost(post.caption).title ?? "Podcast"} />
                ))}
              </div>
            </Section>
          ) : null}

          {scrolls.length ? (
            <Section title="Scrolls">
              <div className="grid grid-cols-2 gap-3">
                {scrolls.map((post) => (
                  <PostTile key={post.id} post={post} />
                ))}
              </div>
            </Section>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 text-lg font-black">{title}</h2>
      {children}
    </div>
  );
}

function ListRow({ post, label, title }: { post: ScrollsPost; label: string; title: string }) {
  const cover = postCoverURL(post);
  return (
    <Link
      href={`/scroll/${post.id}`}
      className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3 transition hover:bg-white/[0.07]"
    >
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-black/40">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="h-full w-full object-cover" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-scrolls-gold">{label}</p>
        <p className="truncate font-bold text-white">{title}</p>
        <p className="truncate text-sm text-white/45">{authorName(post)}</p>
      </div>
    </Link>
  );
}

function PostTile({ post }: { post: ScrollsPost }) {
  const image = postCoverURL(post) ?? postMediaURL(post);
  const caption = strippedCaption(post.caption);
  return (
    <Link href={`/scroll/${post.id}`} className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] transition hover:bg-white/[0.07]">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="aspect-square w-full object-cover" />
      ) : (
        <div className="aspect-square w-full bg-gradient-to-br from-scrolls-panel2 to-black" />
      )}
      <div className="p-2.5">
        <p className="truncate text-xs font-bold text-white">{authorName(post)}</p>
        {caption ? <p className="line-clamp-2 text-xs text-white/50">{caption}</p> : null}
      </div>
    </Link>
  );
}
