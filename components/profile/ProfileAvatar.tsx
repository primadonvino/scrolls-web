"use client";

import { useRef, useState } from "react";
import { userAvatarURL, userAvatarVideoURL, userSignatureURL } from "@/lib/media/urls";
import type { ScrollsUser } from "@/lib/types/scrolls";

type Page = { kind: "photo"; url: string } | { kind: "video"; url: string };

/** Signature overlay that fades in only once it loads, and hides on error. */
function SignatureOverlay({ src }: { src: string }) {
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  if (state === "error") return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="Signature"
      onLoad={() => setState("ok")}
      onError={() => setState("error")}
      className={`pointer-events-none absolute right-3 top-3 h-16 w-16 object-contain drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)] transition-opacity duration-300 ${
        state === "ok" ? "opacity-100" : "opacity-0"
      }`}
    />
  );
}

/**
 * Large square profile avatar matching the iOS/Android profile header — a photo
 * page plus, when set, a looping muted video page. Navigable by swipe, the
 * on-edge arrows, or the dot pager.
 */
export function ProfileAvatar({ profile }: { profile: ScrollsUser }) {
  const photo = userAvatarURL(profile);
  const video = userAvatarVideoURL(profile);
  const signature = userSignatureURL(profile);
  const name = profile.displayName ?? profile.display_name ?? profile.username ?? "Scrolls";

  const pages: Page[] = [];
  if (photo) pages.push({ kind: "photo", url: photo });
  if (video) pages.push({ kind: "video", url: video });

  const [index, setIndex] = useState(0);
  const startX = useRef<number | null>(null);
  const multi = pages.length > 1;

  function go(delta: number) {
    if (!multi) return;
    setIndex((current) => (current + delta + pages.length) % pages.length);
  }

  function onPointerDown(event: React.PointerEvent) {
    startX.current = event.clientX;
  }

  function onPointerUp(event: React.PointerEvent) {
    if (startX.current == null) return;
    const dx = event.clientX - startX.current;
    startX.current = null;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
  }

  const active = pages[Math.min(index, pages.length - 1)];

  return (
    <div
      className="relative aspect-square w-full touch-pan-y select-none overflow-hidden rounded-[1.5rem] border border-white/10 bg-gradient-to-br from-scrolls-blue/40 to-scrolls-gold/40"
      onPointerDown={multi ? onPointerDown : undefined}
      onPointerUp={multi ? onPointerUp : undefined}
    >
      {!active ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/icon.png" alt={name} className="h-full w-full object-cover" />
      ) : active.kind === "photo" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={active.url} alt={name} draggable={false} className="h-full w-full object-cover" />
      ) : (
        <video
          key={active.url}
          src={active.url}
          className="h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
        />
      )}

      {signature ? <SignatureOverlay src={signature} /> : null}

      {multi ? (
        <>
          <button
            type="button"
            aria-label="Previous"
            onClick={() => go(-1)}
            className="absolute left-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white/90 backdrop-blur transition hover:bg-black/70"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next"
            onClick={() => go(1)}
            className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white/90 backdrop-blur transition hover:bg-black/70"
          >
            ›
          </button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {pages.map((page, i) => (
              <button
                key={page.kind + i}
                type="button"
                aria-label={`View ${page.kind}`}
                onClick={() => setIndex(i)}
                className={`h-2 w-2 rounded-full transition ${i === index ? "bg-white" : "bg-white/40 hover:bg-white/70"}`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
