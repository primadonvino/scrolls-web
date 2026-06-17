"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { PostCard } from "@/components/post/PostCard";
import { SiteHeader } from "@/components/SiteHeader";
import { searchPosts, searchUsers } from "@/lib/api/scrolls";
import { readFreshSession } from "@/lib/auth/session";
import type { ScrollsPost, ScrollsUser } from "@/lib/types/scrolls";

type Tab = "users" | "posts";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("users");
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
        const deduped = Array.from(new Map(merged.map((post) => [post.id, post])).values());
        setPosts(deduped);
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

  const activeResults = tab === "users" ? users.length : posts.length;

  return (
    <div>
      <SiteHeader />
      <section className="mx-auto max-w-2xl px-5 pb-16">
        <div className="mb-5">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-scrolls-gold">Search</p>
          <h1 className="mt-2 text-4xl font-black">Find people &amp; scrolls</h1>
        </div>

        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search users, posts, music..."
          autoFocus
          className="w-full rounded-full border border-white/12 bg-black px-5 py-3 text-base text-white outline-none placeholder:text-white/30 focus:border-white/30"
        />

        <div className="mt-4 flex gap-2">
          {(["users", "posts"] as Tab[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={`rounded-full px-4 py-2 text-sm font-black capitalize transition ${
                tab === value ? "bg-white text-black" : "border border-white/12 text-white/70 hover:bg-white/10"
              }`}
            >
              {value}
              {value === "users" && users.length ? ` ${users.length}` : ""}
              {value === "posts" && posts.length ? ` ${posts.length}` : ""}
            </button>
          ))}
        </div>

        {error ? <p className="mt-5 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-red-200">{error}</p> : null}
        {loading ? <p className="mt-5 text-white/55">Searching...</p> : null}
        {!loading && searched && activeResults === 0 ? (
          <p className="mt-5 text-white/50">No {tab} found for &ldquo;{query.trim()}&rdquo;.</p>
        ) : null}

        {tab === "users" ? (
          <div className="mt-5 space-y-2">
            {users.map((user) => (
              <Link
                key={user.id}
                href={`/user/${encodeURIComponent(user.username)}`}
                className="flex items-center gap-3 rounded-3xl border border-white/[0.08] bg-white/[0.03] p-3 transition hover:bg-white/[0.07]"
              >
                <Avatar user={user} size={46} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-bold text-white">
                      {user.displayName ?? user.display_name ?? user.username}
                    </p>
                    {(user.isFounder ?? user.is_founder) ? (
                      <span className="rounded-full bg-scrolls-gold px-2 py-0.5 text-[10px] font-bold text-black">Founder</span>
                    ) : null}
                    {(user.isVerified ?? user.is_verified) ? (
                      <span className="rounded-full bg-scrolls-blue px-2 py-0.5 text-[10px] font-bold">Verified</span>
                    ) : null}
                  </div>
                  <p className="truncate text-sm text-white/50">@{user.username}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-5 space-y-6">
            {posts.map((post) => <PostCard key={post.id} post={post} />)}
          </div>
        )}
      </section>
    </div>
  );
}
