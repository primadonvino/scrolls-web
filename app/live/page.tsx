"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { SiteHeader } from "@/components/SiteHeader";
import { UserBadges } from "@/components/UserBadges";
import { fetchMoments } from "@/lib/api/scrolls";
import { readFreshSession } from "@/lib/auth/session";
import type { ScrollsMoment } from "@/lib/types/scrolls";

type State =
  | { status: "loading" }
  | { status: "login" }
  | { status: "error"; message: string }
  | { status: "ready"; live: ScrollsMoment[]; selfId: string };

function isOwnLive(moment: ScrollsMoment, selfId: string): boolean {
  return moment.liveSession?.ownerUserID === selfId || moment.user?.id === selfId;
}

export default function LivePage() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const session = await readFreshSession();
      if (!session?.token || !session.user?.id) {
        if (!cancelled) setState({ status: "login" });
        return;
      }
      try {
        const moments = await fetchMoments(session.user.id, session.token);
        const live = (Array.isArray(moments) ? moments : []).filter((m) => m.liveSession?.id);
        if (!cancelled) setState({ status: "ready", live, selfId: session.user.id });
      } catch (err) {
        if (!cancelled) setState({ status: "error", message: err instanceof Error ? err.message : "Could not load live streams." });
      }
    };
    load();
    const interval = window.setInterval(load, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <div>
      <SiteHeader />
      <section className="mx-auto max-w-3xl px-5 pb-16">
        <div className="mb-6">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-scrolls-gold">Live</p>
          <h1 className="mt-2 text-4xl font-black">Live now</h1>
        </div>

        {state.status === "loading" ? <p className="text-white/55">Loading live streams…</p> : null}

        {state.status === "login" ? (
          <div className="scrolls-glass rounded-[1.8rem] p-6">
            <p className="text-white/62">Log in to see who&rsquo;s live.</p>
            <Link href="/login" className="mt-5 inline-block rounded-full bg-white px-5 py-3 text-sm font-black text-black">
              Log in
            </Link>
          </div>
        ) : null}

        {state.status === "error" ? (
          <p className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-red-200">{state.message}</p>
        ) : null}

        {state.status === "ready" ? <LiveBody live={state.live} selfId={state.selfId} /> : null}
      </section>
    </div>
  );
}

function LiveBody({ live, selfId }: { live: ScrollsMoment[]; selfId: string }) {
  const own = live.find((moment) => isOwnLive(moment, selfId));
  const others = live.filter((moment) => !isOwnLive(moment, selfId));

  return (
    <div className="space-y-6">
      {own ? <OwnLiveCard moment={own} /> : null}

      {own ? <h2 className="pt-2 text-lg font-black text-white">Following</h2> : null}
      {others.length === 0 ? (
        <p className="text-white/55">{own ? "No one you follow is live right now." : "No one is live right now. Check back soon."}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {others.map((moment) => (
            <LiveCard key={moment.liveSession!.id} moment={moment} />
          ))}
        </div>
      )}
    </div>
  );
}

function OwnLiveCard({ moment }: { moment: ScrollsMoment }) {
  const live = moment.liveSession!;
  const viewers = moment.viewCount ?? 0;
  return (
    <div className="scrolls-glass rounded-[1.8rem] border-scrolls-gold/30 p-5">
      <div className="flex items-center gap-2 text-xs font-black">
        <span className="rounded-full bg-red-500/90 px-2.5 py-1 text-white">● YOU&rsquo;RE LIVE</span>
      </div>
      <p className="mt-3 text-xl font-black text-white">{live.title || "Your live stream"}</p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Viewers" value={String(viewers)} />
        <Stat label="Tip goal" value={live.tipGoal ? `$${Math.round(live.tipGoal)}` : "—"} />
        <Stat label="Status" value="Streaming" />
      </div>
      <p className="mt-4 text-xs text-white/45">
        Live chat and tips are managed in the Scrolls app.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link href={`/live/${live.id}`} className="rounded-full bg-white px-5 py-2.5 text-sm font-black text-black">
          View your stream
        </Link>
        <a href="scrolls://live" className="rounded-full bg-scrolls-blue px-5 py-2.5 text-sm font-bold text-white">
          Manage in app
        </a>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-3 text-center">
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-white/45">{label}</p>
    </div>
  );
}

function LiveCard({ moment }: { moment: ScrollsMoment }) {
  const user = moment.user;
  const name = user?.displayName ?? user?.display_name ?? user?.username ?? "Scrolls";
  return (
    <Link
      href={`/live/${moment.liveSession!.id}`}
      className="scrolls-glass overflow-hidden rounded-[1.5rem] p-4 transition hover:bg-white/[0.06]"
    >
      <div className="mb-3 flex items-center gap-3">
        <Avatar user={user} size={40} />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-bold">{name}</span>
            <UserBadges user={user} size={14} />
          </div>
          <p className="truncate text-sm text-white/50">@{user?.username ?? "user"}</p>
        </div>
      </div>
      <p className="font-bold text-white">{moment.liveSession?.title || "Live stream"}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-bold">
        <span className="rounded-full bg-red-500/90 px-2 py-0.5 text-white">● LIVE</span>
        {moment.viewCount ? <span className="text-white/45">{moment.viewCount} watching</span> : null}
        {moment.liveSession?.tipGoal ? <span className="text-scrolls-gold">${Math.round(moment.liveSession.tipGoal)} goal</span> : null}
      </div>
    </Link>
  );
}
