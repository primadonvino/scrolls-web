"use client";

import { useState } from "react";
import { userAvatarURL, userAvatarVideoURL } from "@/lib/media/urls";
import type { ScrollsUser } from "@/lib/types/scrolls";

type Page = { kind: "photo"; url: string } | { kind: "video"; url: string };

/**
 * Large square profile avatar matching the iOS/Android profile header — a
 * photo page plus, when set, a looping muted video page, switchable via dots.
 */
export function ProfileAvatar({ profile }: { profile: ScrollsUser }) {
  const photo = userAvatarURL(profile);
  const video = userAvatarVideoURL(profile);
  const name = profile.displayName ?? profile.display_name ?? profile.username ?? "?";
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  const pages: Page[] = [];
  if (photo) pages.push({ kind: "photo", url: photo });
  if (video) pages.push({ kind: "video", url: video });

  const [index, setIndex] = useState(0);
  const active = pages[Math.min(index, pages.length - 1)];

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-[1.5rem] border border-white/10 bg-gradient-to-br from-scrolls-blue/40 to-scrolls-gold/40">
      {!active ? (
        <div className="grid h-full w-full place-items-center text-6xl font-black text-white/85">{initial}</div>
      ) : active.kind === "photo" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={active.url} alt={name} className="h-full w-full object-cover" />
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

      {pages.length > 1 ? (
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
      ) : null}
    </div>
  );
}
