"use client";

import Link from "next/link";
import { useState } from "react";
import { blockUser, followUser, reportContent, unfollowUser } from "@/lib/api/scrolls";
import { readFreshSession, readSession } from "@/lib/auth/session";
import type { AuthSession, ScrollsUser } from "@/lib/types/scrolls";

// The public profile payload doesn't carry follow state, so we track it
// optimistically after the viewer acts. "unknown" shows the default Follow CTA.
type Relationship = "unknown" | "none" | "requested" | "following";

export function ProfileActions({ profile }: { profile: ScrollsUser }) {
  const [session, setSession] = useState<AuthSession | null>(() => readSession());
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [relationship, setRelationship] = useState<Relationship>("unknown");
  const signedIn = Boolean(session?.token && session.user?.id);
  const isSelf = session?.user?.id === profile.id;

  async function follow() {
    const freshSession = await readFreshSession();
    setSession(freshSession);
    if (!freshSession?.token || !freshSession.user?.id || isSelf) return;
    setBusy("follow");
    setStatus(null);
    try {
      const result = await followUser(freshSession.user.id, profile.id, freshSession.token);
      setRelationship(result.requested ? "requested" : "following");
      setStatus(result.requested ? "Follow request sent." : "Following.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not follow this profile.");
    } finally {
      setBusy(null);
    }
  }

  async function unfollow() {
    const freshSession = await readFreshSession();
    setSession(freshSession);
    if (!freshSession?.token || !freshSession.user?.id || isSelf) return;
    setBusy("unfollow");
    setStatus(null);
    try {
      const result = await unfollowUser(freshSession.user.id, profile.id, freshSession.token);
      if (result.required) {
        setRelationship("following");
        setStatus("Founder accounts are required follows.");
      } else {
        setRelationship("none");
        setStatus("Unfollowed.");
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not unfollow this profile.");
    } finally {
      setBusy(null);
    }
  }

  async function block() {
    const freshSession = await readFreshSession();
    setSession(freshSession);
    if (!freshSession?.token || isSelf) return;
    setBusy("block");
    setStatus(null);
    try {
      await blockUser(profile.id, freshSession.token);
      setStatus("Blocked. Their posts will be removed from your feed.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not block this profile.");
    } finally {
      setBusy(null);
    }
  }

  async function report() {
    const freshSession = await readFreshSession();
    setSession(freshSession);
    if (!freshSession?.token || isSelf) return;
    setBusy("report");
    setStatus(null);
    try {
      await reportContent("profile", profile.id, "impersonation", freshSession.token, profile.id);
      setStatus("Report sent. Thank you.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not report this profile.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap gap-3">
        <a href={`scrolls://user/${profile.username}`} className="rounded-full bg-scrolls-blue px-5 py-3 text-sm font-bold">
          Open in Scrolls
        </a>
        {!signedIn ? (
          <Link href="/login" className="rounded-full border border-white/15 px-5 py-3 text-sm font-bold text-white/85">
            Log in to follow
          </Link>
        ) : null}
        {signedIn && !isSelf ? (
          <>
            {relationship === "following" ? (
              <button
                type="button"
                disabled={busy === "unfollow"}
                onClick={unfollow}
                className="rounded-full border border-white/20 px-5 py-3 text-sm font-bold text-white/85 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {busy === "unfollow" ? "Unfollowing..." : "Unfollow"}
              </button>
            ) : relationship === "requested" ? (
              <button
                type="button"
                disabled={busy === "unfollow"}
                onClick={unfollow}
                className="rounded-full border border-white/20 px-5 py-3 text-sm font-bold text-white/70 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {busy === "unfollow" ? "..." : "Requested · Cancel"}
              </button>
            ) : (
              <button
                type="button"
                disabled={busy === "follow"}
                onClick={follow}
                className="rounded-full bg-white px-5 py-3 text-sm font-black text-black disabled:cursor-not-allowed disabled:opacity-45"
              >
                {busy === "follow" ? "Following..." : "Follow"}
              </button>
            )}
            <button
              type="button"
              disabled={busy === "block"}
              onClick={block}
              className="rounded-full border border-red-400/30 px-5 py-3 text-sm font-bold text-red-200 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {busy === "block" ? "Blocking..." : "Block"}
            </button>
            <button
              type="button"
              disabled={busy === "report"}
              onClick={report}
              className="rounded-full border border-white/15 px-5 py-3 text-sm font-bold text-white/80 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {busy === "report" ? "Reporting..." : "Report"}
            </button>
          </>
        ) : null}
      </div>
      {status ? <p className="mt-3 text-sm text-white/55">{status}</p> : null}
    </div>
  );
}
