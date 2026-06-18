"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { OpenInAppCTA } from "@/components/OpenInAppCTA";
import { SiteHeader } from "@/components/SiteHeader";
import { UserBadges } from "@/components/UserBadges";
import { fetchMoments } from "@/lib/api/scrolls";
import { readFreshSession } from "@/lib/auth/session";
import type { ScrollsMoment } from "@/lib/types/scrolls";

type State =
  | { status: "loading" }
  | { status: "login" }
  | { status: "ended" }
  | { status: "live"; moment: ScrollsMoment };

export default function LiveViewerPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params?.sessionId;
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!sessionId) return;
      const session = await readFreshSession();
      if (!session?.token || !session.user?.id) {
        if (!cancelled) setState({ status: "login" });
        return;
      }
      try {
        const moments = await fetchMoments(session.user.id, session.token);
        const moment = (Array.isArray(moments) ? moments : []).find((m) => m.liveSession?.id === sessionId);
        if (cancelled) return;
        setState(moment?.liveSession ? { status: "live", moment } : { status: "ended" });
      } catch {
        if (!cancelled) setState({ status: "ended" });
      }
    };
    load();
    const interval = window.setInterval(load, 20_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [sessionId]);

  return (
    <div>
      <SiteHeader />
      <section className="mx-auto max-w-3xl px-5 pb-16">
        {state.status === "loading" ? <p className="py-10 text-white/55">Loading…</p> : null}

        {state.status === "login" ? (
          <div className="scrolls-glass mt-6 rounded-[1.8rem] p-6">
            <p className="text-white/62">Log in to watch this live stream.</p>
            <Link href="/login" className="mt-5 inline-block rounded-full bg-white px-5 py-3 text-sm font-black text-black">
              Log in
            </Link>
          </div>
        ) : null}

        {state.status === "ended" ? (
          <div className="mt-6 space-y-6">
            <div className="scrolls-glass rounded-[1.8rem] p-8 text-center">
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-scrolls-gold">Live</p>
              <h1 className="mt-3 text-3xl font-black">This live stream has ended</h1>
              <p className="mt-3 text-sm text-white/55">It may have finished, or it isn&rsquo;t available to you on the web.</p>
              <Link href="/live" className="mt-6 inline-block rounded-full border border-white/15 px-5 py-3 text-sm font-bold text-white/85">
                See who&rsquo;s live
              </Link>
            </div>
            <OpenInAppCTA deepLink="scrolls://live" title="Catch the next one in Scrolls" subtitle="Open the app to watch live streams and join the chat." />
          </div>
        ) : null}

        {state.status === "live" ? <LivePlayer moment={state.moment} /> : null}
      </section>
    </div>
  );
}

function LivePlayer({ moment }: { moment: ScrollsMoment }) {
  const live = moment.liveSession!;
  const user = moment.user;
  const name = user?.displayName ?? user?.display_name ?? user?.username ?? "Scrolls";
  const iframeURL = live.iframePlaybackURL?.trim();
  const playbackURL = live.playbackURL?.trim();

  return (
    <div className="mt-6 space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black">
        <span className="absolute left-3 top-3 z-10 rounded-full bg-red-500/90 px-2.5 py-1 text-xs font-black text-white">● LIVE</span>
        <div className="aspect-video w-full">
          {iframeURL ? (
            <iframe
              src={iframeURL}
              title={live.title ?? "Live stream"}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              className="h-full w-full"
            />
          ) : playbackURL ? (
            // Native HLS works in Safari; other browsers should use the iframe URL above.
            <video src={playbackURL} controls autoPlay playsInline className="h-full w-full object-contain" />
          ) : (
            <div className="grid h-full place-items-center text-sm text-white/55">Stream unavailable.</div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Avatar user={user} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Link href={`/user/${user?.username ?? ""}`} className="truncate font-bold hover:underline">{name}</Link>
            <UserBadges user={user} size={15} />
          </div>
          <p className="truncate text-sm text-white/50">@{user?.username ?? "user"}</p>
        </div>
        {moment.viewCount ? <span className="shrink-0 text-sm text-white/45">{moment.viewCount} watching</span> : null}
      </div>

      {live.title ? <p className="text-lg font-bold text-white">{live.title}</p> : null}

      {live.tipGoal ? (
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm">
          <span className="font-black text-scrolls-gold">Tip goal ${Math.round(live.tipGoal)}</span>
          <span className="text-white/45">· Tip and chat in the Scrolls app</span>
        </div>
      ) : null}

      <OpenInAppCTA
        deepLink="scrolls://live"
        title="Join the live chat in Scrolls"
        subtitle="Open the app to comment, tip, and interact during the stream."
      />
    </div>
  );
}
