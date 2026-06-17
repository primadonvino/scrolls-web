"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { SiteHeader } from "@/components/SiteHeader";
import { fetchCircles } from "@/lib/api/scrolls";
import { readFreshSession } from "@/lib/auth/session";
import { circlePreviewLabel } from "@/lib/circles/preview";
import type { ScrollsCircle } from "@/lib/types/scrolls";

type State =
  | { status: "loading" }
  | { status: "login" }
  | { status: "error"; message: string }
  | { status: "ready"; circles: ScrollsCircle[] };

export default function CirclesPage() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [selfId, setSelfId] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const session = await readFreshSession();
      if (!session?.token || !session.user?.id) {
        if (!cancelled) setState({ status: "login" });
        return;
      }
      setSelfId(session.user.id);
      try {
        const circles = await fetchCircles(session.user.id, session.token);
        if (!cancelled) setState({ status: "ready", circles: Array.isArray(circles) ? circles : [] });
      } catch (err) {
        if (!cancelled) {
          setState({ status: "error", message: err instanceof Error ? err.message : "Could not load circles." });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <SiteHeader />
      <section className="mx-auto max-w-2xl px-5 pb-16">
        <div className="mb-2">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-scrolls-gold">Messages</p>
          <h1 className="mt-2 text-4xl font-black">Circles</h1>
        </div>
        <p className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white/55">
          🔒 Messages encrypted on a device can&rsquo;t be read on the web. Open a circle in the
          Scrolls app to read and reply to those.
        </p>

        {state.status === "loading" ? <p className="text-white/55">Loading circles…</p> : null}

        {state.status === "login" ? (
          <div className="scrolls-glass rounded-[1.8rem] p-6">
            <p className="text-white/62">Log in to see your circles.</p>
            <Link href="/login" className="mt-5 inline-block rounded-full bg-white px-5 py-3 text-sm font-black text-black">
              Log in
            </Link>
          </div>
        ) : null}

        {state.status === "error" ? (
          <p className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-red-200">{state.message}</p>
        ) : null}

        {state.status === "ready" && state.circles.length === 0 ? (
          <p className="text-white/55">You&rsquo;re not in any circles yet.</p>
        ) : null}

        {state.status === "ready" && state.circles.length > 0 ? (
          <div className="space-y-2">
            {state.circles.map((circle) => (
              <CircleRow key={circle.id} circle={circle} selfId={selfId} />
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function CircleRow({ circle, selfId }: { circle: ScrollsCircle; selfId?: string }) {
  const members = (circle.members ?? []).filter((member) => member.user?.id !== selfId);
  const title =
    circle.name?.trim() ||
    members.map((member) => member.user?.displayName ?? member.user?.display_name ?? member.user?.username).filter(Boolean).join(", ") ||
    "Circle";
  const messages = circle.messages ?? [];
  const last = messages[messages.length - 1];
  const when = formatWhen(last?.createdAt ?? circle.createdAt);

  return (
    <a
      href="scrolls://circles"
      className="flex items-center gap-3 rounded-3xl border border-white/[0.08] bg-white/[0.03] p-3 transition hover:bg-white/[0.07]"
    >
      <div className="flex -space-x-3">
        {(members.length ? members : circle.members ?? []).slice(0, 3).map((member) => (
          <Avatar key={member.id} user={member.user} size={40} />
        ))}
        {members.length === 0 ? <Avatar user={undefined} size={40} /> : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-white">{title}</p>
        <p className="truncate text-sm text-white/45">
          {circlePreviewLabel(last, selfId)}
        </p>
      </div>
      {when ? <span className="shrink-0 text-xs text-white/40">{when}</span> : null}
    </a>
  );
}

function formatWhen(iso?: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
