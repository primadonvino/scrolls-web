"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { SiteHeader } from "@/components/SiteHeader";
import {
  fetchFollowers,
  fetchFollowing,
  fetchFollowRequests,
  respondToFollowRequest,
  unfollowUser
} from "@/lib/api/scrolls";
import { readFreshSession, readSession } from "@/lib/auth/session";
import type { AuthSession, ScrollsUser } from "@/lib/types/scrolls";

function displayNameOf(user: ScrollsUser): string {
  return user.displayName ?? user.display_name ?? user.username;
}

type DirectoryTab = "following" | "followers" | "requests";

const TAB_LABELS: Record<DirectoryTab, string> = {
  following: "Following",
  followers: "Followers",
  requests: "Requests"
};

function matchesQuery(user: ScrollsUser, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    (user.username ?? "").toLowerCase().includes(q) ||
    displayNameOf(user).toLowerCase().includes(q)
  );
}

export default function SocialPage() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(() => readSession());
  const [following, setFollowing] = useState<ScrollsUser[]>([]);
  const [followers, setFollowers] = useState<ScrollsUser[]>([]);
  const [requests, setRequests] = useState<ScrollsUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tab, setTab] = useState<DirectoryTab>("following");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    const fresh = await readFreshSession();
    setSession(fresh);
    if (!fresh?.token || !fresh.user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [followingList, followersList, requestList] = await Promise.all([
        fetchFollowing(fresh.user.id, fresh.token).catch(() => []),
        fetchFollowers(fresh.user.id, fresh.token).catch(() => []),
        fetchFollowRequests(fresh.token).catch(() => [])
      ]);
      setFollowing(followingList);
      setFollowers(followersList);
      setRequests(requestList);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not load your social lists.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function respond(requester: ScrollsUser, accept: boolean) {
    const fresh = await readFreshSession();
    setSession(fresh);
    if (!fresh?.token || !fresh.user?.id) return;
    setBusyId(requester.id);
    setStatus(null);
    try {
      await respondToFollowRequest(fresh.user.id, requester.id, accept, fresh.token);
      setRequests((list) => list.filter((u) => u.id !== requester.id));
      if (accept) setFollowers((list) => (list.some((u) => u.id === requester.id) ? list : [requester, ...list]));
      setStatus(accept ? `Accepted @${requester.username}.` : `Declined @${requester.username}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not respond to that request.");
    } finally {
      setBusyId(null);
    }
  }

  async function unfollow(user: ScrollsUser) {
    const fresh = await readFreshSession();
    setSession(fresh);
    if (!fresh?.token || !fresh.user?.id) return;
    setBusyId(user.id);
    setStatus(null);
    try {
      const result = await unfollowUser(fresh.user.id, user.id, fresh.token);
      if (result.required) {
        setStatus("Founder accounts are required follows.");
      } else {
        setFollowing((list) => list.filter((u) => u.id !== user.id));
        setStatus(`Unfollowed @${user.username}.`);
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not unfollow that account.");
    } finally {
      setBusyId(null);
    }
  }

  const user = session?.user;

  return (
    <div>
      <SiteHeader />
      <section className="mx-auto max-w-2xl px-5 pb-16">
        {!user ? (
          <div className="scrolls-glass mt-6 rounded-[1.8rem] p-6">
            <p className="text-white/62">Log in to see your directory.</p>
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="mt-5 rounded-full bg-white px-5 py-3 text-sm font-black text-black"
            >
              Log in
            </button>
          </div>
        ) : (
          <>
            {/* Header: list selector */}
            <div className="mb-5 flex items-center justify-center pt-2">
              <details className="group relative">
                <summary className="flex cursor-pointer list-none items-center gap-2 text-3xl font-black">
                  {TAB_LABELS[tab]}
                  <span className="text-xl text-white/40 transition group-open:rotate-180">⌄</span>
                </summary>
                <div className="absolute left-1/2 z-30 mt-2 w-48 -translate-x-1/2 overflow-hidden rounded-2xl border border-white/10 bg-scrolls-panel p-1 shadow-glow">
                  {(["following", "followers", "requests"] as DirectoryTab[]).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={(event) => {
                        setTab(value);
                        event.currentTarget.closest("details")?.removeAttribute("open");
                      }}
                      className={`block w-full rounded-xl px-4 py-2.5 text-left text-sm font-bold transition hover:bg-white/10 ${
                        tab === value ? "text-scrolls-gold" : "text-white/85"
                      }`}
                    >
                      {tab === value ? "✓ " : ""}
                      {TAB_LABELS[value]}
                    </button>
                  ))}
                </div>
              </details>
            </div>

            {/* Search */}
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by username"
              autoCapitalize="none"
              autoCorrect="off"
              className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/30"
            />

            {/* Stats */}
            <div className="mt-4 grid grid-cols-4 gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
              <DirStat label="Following" value={following.length} active={tab === "following"} onClick={() => setTab("following")} />
              <DirStat label="Followers" value={followers.length} active={tab === "followers"} onClick={() => setTab("followers")} />
              <DirStat label="Subscribed" value="—" />
              <DirStat label="Requests" value={requests.length} active={tab === "requests"} onClick={() => setTab("requests")} />
            </div>

            {status ? <p className="mt-4 text-sm text-white/60">{status}</p> : null}

            {/* Active list */}
            <div className="mt-5 space-y-2">
              {loading ? <p className="text-white/55">Loading…</p> : <DirectoryList />}
            </div>
          </>
        )}
      </section>
    </div>
  );

  function DirectoryList() {
    const list = (tab === "following" ? following : tab === "followers" ? followers : requests).filter((u) =>
      matchesQuery(u, query)
    );
    if (list.length === 0) {
      return <p className="text-sm text-white/45">{query.trim() ? "No matches." : `No ${TAB_LABELS[tab].toLowerCase()} yet.`}</p>;
    }
    return (
      <>
        {list.map((entry) => (
          <UserRow key={entry.id} user={entry}>
            {tab === "requests" ? (
              <>
                <button
                  type="button"
                  disabled={busyId === entry.id}
                  onClick={() => respond(entry, true)}
                  className="rounded-full bg-white px-4 py-2 text-xs font-black text-black disabled:opacity-45"
                >
                  Accept
                </button>
                <button
                  type="button"
                  disabled={busyId === entry.id}
                  onClick={() => respond(entry, false)}
                  className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-white/80 disabled:opacity-45"
                >
                  Deny
                </button>
              </>
            ) : tab === "following" ? (
              <button
                type="button"
                disabled={busyId === entry.id}
                onClick={() => unfollow(entry)}
                className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-white/80 disabled:opacity-45"
              >
                {busyId === entry.id ? "..." : "Unfollow"}
              </button>
            ) : null}
          </UserRow>
        ))}
      </>
    );
  }
}

function DirStat({
  label,
  value,
  active,
  onClick
}: {
  label: string;
  value: number | string;
  active?: boolean;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <p className={`text-2xl font-black ${active ? "text-scrolls-gold" : "text-white"}`}>{value}</p>
      <p className="mt-0.5 text-xs font-bold text-white/45">{label}</p>
    </>
  );
  if (!onClick) return <div className="px-1">{inner}</div>;
  return (
    <button type="button" onClick={onClick} className="rounded-xl px-1 py-1 transition hover:bg-white/5">
      {inner}
    </button>
  );
}

function UserRow({ user, children }: { user: ScrollsUser; children?: React.ReactNode }) {
  return (
    <div className="scrolls-glass flex items-center gap-3 rounded-2xl px-4 py-3">
      <Link href={`/user/${user.username}`} className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar user={user} size={44} />
        <div className="min-w-0">
          <p className="truncate font-bold text-white">{displayNameOf(user)}</p>
          <p className="truncate text-sm text-white/45">@{user.username}</p>
        </div>
      </Link>
      {children ? (
        <div className="flex shrink-0 gap-2">{children}</div>
      ) : (
        <Link href={`/user/${user.username}`} className="shrink-0 text-white/30">›</Link>
      )}
    </div>
  );
}
