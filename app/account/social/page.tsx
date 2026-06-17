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

export default function SocialPage() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(() => readSession());
  const [following, setFollowing] = useState<ScrollsUser[]>([]);
  const [followers, setFollowers] = useState<ScrollsUser[]>([]);
  const [requests, setRequests] = useState<ScrollsUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

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
        <div className="mb-6">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-scrolls-gold">Account</p>
          <h1 className="mt-2 text-4xl font-black">Social</h1>
          <Link href="/account" className="mt-2 inline-block text-sm font-bold text-scrolls-blue">← Back to settings</Link>
        </div>

        {!user ? (
          <div className="scrolls-glass rounded-[1.8rem] p-6">
            <p className="text-white/62">Log in to manage your followers and requests.</p>
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="mt-5 rounded-full bg-white px-5 py-3 text-sm font-black text-black"
            >
              Log in
            </button>
          </div>
        ) : loading ? (
          <p className="text-white/55">Loading...</p>
        ) : (
          <div className="space-y-8">
            {status ? <p className="text-sm text-white/60">{status}</p> : null}

            <SocialSection title="Follow requests" count={requests.length} emptyText="No pending requests.">
              {requests.map((requester) => (
                <UserRow key={requester.id} user={requester}>
                  <button
                    type="button"
                    disabled={busyId === requester.id}
                    onClick={() => respond(requester, true)}
                    className="rounded-full bg-white px-4 py-2 text-xs font-black text-black disabled:opacity-45"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    disabled={busyId === requester.id}
                    onClick={() => respond(requester, false)}
                    className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-white/80 disabled:opacity-45"
                  >
                    Deny
                  </button>
                </UserRow>
              ))}
            </SocialSection>

            <SocialSection title="Following" count={following.length} emptyText="You're not following anyone yet.">
              {following.map((followee) => (
                <UserRow key={followee.id} user={followee}>
                  <button
                    type="button"
                    disabled={busyId === followee.id}
                    onClick={() => unfollow(followee)}
                    className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-white/80 disabled:opacity-45"
                  >
                    {busyId === followee.id ? "..." : "Unfollow"}
                  </button>
                </UserRow>
              ))}
            </SocialSection>

            <SocialSection title="Followers" count={followers.length} emptyText="No followers yet.">
              {followers.map((follower) => (
                <UserRow key={follower.id} user={follower} />
              ))}
            </SocialSection>
          </div>
        )}
      </section>
    </div>
  );
}

function SocialSection({
  title,
  count,
  emptyText,
  children
}: {
  title: string;
  count: number;
  emptyText: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="mb-3 text-lg font-black">
        {title} <span className="text-white/40">{count}</span>
      </h2>
      {count === 0 ? (
        <p className="text-sm text-white/45">{emptyText}</p>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </div>
  );
}

function UserRow({ user, children }: { user: ScrollsUser; children?: React.ReactNode }) {
  return (
    <div className="scrolls-glass flex items-center gap-3 rounded-2xl px-4 py-3">
      <Link href={`/user/${user.username}`} className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar user={user} size={40} />
        <div className="min-w-0">
          <p className="truncate font-bold text-white">{displayNameOf(user)}</p>
          <p className="truncate text-sm text-white/45">@{user.username}</p>
        </div>
      </Link>
      {children ? <div className="flex shrink-0 gap-2">{children}</div> : null}
    </div>
  );
}
