"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { SiteHeader } from "@/components/SiteHeader";
import { fetchCircles } from "@/lib/api/scrolls";
import { readFreshSession } from "@/lib/auth/session";
import { circlePreview, circleVoiceDurationSeconds, circleVoiceURL } from "@/lib/circles/preview";
import type { ScrollsCircle, ScrollsCircleMessage, ScrollsUser } from "@/lib/types/scrolls";

type State =
  | { status: "loading" }
  | { status: "login" }
  | { status: "error"; message: string }
  | { status: "missing" }
  | { status: "ready"; circle: ScrollsCircle };

function nameOf(user?: ScrollsUser): string {
  return user?.displayName ?? user?.display_name ?? user?.username ?? "Someone";
}

export default function CircleThreadPage({ params }: { params: Promise<{ circleId: string }> }) {
  const { circleId } = use(params);
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
        const circle = (Array.isArray(circles) ? circles : []).find((c) => c.id === circleId);
        if (cancelled) return;
        setState(circle ? { status: "ready", circle } : { status: "missing" });
      } catch (err) {
        if (!cancelled) {
          setState({ status: "error", message: err instanceof Error ? err.message : "Could not load this circle." });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [circleId]);

  return (
    <div>
      <SiteHeader />
      <section className="mx-auto max-w-2xl px-5 pb-28">
        <Link href="/circles" className="text-sm font-bold text-scrolls-blue">← Circles</Link>

        {state.status === "loading" ? <p className="mt-6 text-white/55">Loading…</p> : null}

        {state.status === "login" ? (
          <div className="scrolls-glass mt-6 rounded-[1.8rem] p-6">
            <p className="text-white/62">Log in to view this circle.</p>
            <Link href="/login" className="mt-5 inline-block rounded-full bg-white px-5 py-3 text-sm font-black text-black">Log in</Link>
          </div>
        ) : null}

        {state.status === "error" ? (
          <p className="mt-6 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-red-200">{state.message}</p>
        ) : null}

        {state.status === "missing" ? (
          <p className="mt-6 text-white/55">This circle isn&rsquo;t available on the web.</p>
        ) : null}

        {state.status === "ready" ? <Thread circle={state.circle} selfId={selfId} /> : null}
      </section>
    </div>
  );
}

function Thread({ circle, selfId }: { circle: ScrollsCircle; selfId?: string }) {
  const others = (circle.members ?? []).filter((m) => m.user?.id !== selfId);
  const title =
    circle.name?.trim() ||
    others.map((m) => nameOf(m.user)).filter(Boolean).join(", ") ||
    "Circle";
  const messages = [...(circle.messages ?? [])].sort((a, b) => {
    const at = a.createdAt ? Date.parse(a.createdAt) : 0;
    const bt = b.createdAt ? Date.parse(b.createdAt) : 0;
    return at - bt;
  });

  return (
    <div className="mt-3">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex -space-x-3">
          {(others.length ? others : circle.members ?? []).slice(0, 3).map((m) => (
            <Avatar key={m.id} user={m.user} size={40} />
          ))}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-black">{title}</h1>
          <p className="text-sm text-white/45">{(circle.members ?? []).length} members</p>
        </div>
      </div>

      {messages.length === 0 ? (
        <p className="text-white/45">No messages yet.</p>
      ) : (
        <div className="space-y-3">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} mine={Boolean(selfId && message.user?.id === selfId)} />
          ))}
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 border-t border-white/10 bg-scrolls-black/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-5 py-4">
          <p className="text-sm text-white/55">Replies happen in the Scrolls app.</p>
          <a href="scrolls://circles" className="shrink-0 rounded-full bg-scrolls-blue px-4 py-2 text-sm font-black text-white">
            Reply in app
          </a>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message, mine }: { message: ScrollsCircleMessage; mine: boolean }) {
  const preview = circlePreview(message);
  const when = message.createdAt ? new Date(message.createdAt) : null;
  const time = when && !Number.isNaN(when.getTime())
    ? when.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : null;
  const align = mine ? "items-end" : "items-start";
  const bubble = mine ? "bg-scrolls-blue text-white" : "bg-white/[0.06] text-white";

  return (
    <div className={`flex flex-col gap-1 ${align}`}>
      {!mine ? <p className="px-1 text-xs font-bold text-white/45">{nameOf(message.user)}</p> : null}
      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${bubble}`}>
        {preview.kind === "text" ? (
          <p className="whitespace-pre-wrap break-words text-sm leading-6">{preview.text}</p>
        ) : null}
        {preview.kind === "voice" ? <VoiceMessage message={message} /> : null}
        {preview.kind === "encrypted" ? (
          <p className="text-sm text-white/70">🔒 Encrypted — open in the Scrolls app</p>
        ) : null}
        {preview.kind === "empty" ? <p className="text-sm text-white/50">—</p> : null}
      </div>
      {time ? <p className="px-1 text-[11px] text-white/35">{time}</p> : null}
    </div>
  );
}

function VoiceMessage({ message }: { message: ScrollsCircleMessage }) {
  const url = circleVoiceURL(message);
  const seconds = circleVoiceDurationSeconds(message);
  const label = seconds ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}` : null;

  if (!url) {
    return <p className="text-sm text-white/70">🎤 Voice message (unavailable)</p>;
  }
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span>🎤 Voice message</span>
        {label ? <span className="text-white/60">{label}</span> : null}
      </div>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio controls preload="none" src={url} className="mt-1 h-9 w-full" />
    </div>
  );
}
