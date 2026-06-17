"use client";

import { useRef, useState } from "react";

/**
 * Swipeable photo carousel for multi-photo posts (the primary asset plus the
 * extra images encoded in the `[PHOTO_CAROUSEL_BASE64]` caption marker).
 */
export function PhotoCarousel({ images, alt }: { images: string[]; alt?: string }) {
  const [index, setIndex] = useState(0);
  const startX = useRef<number | null>(null);
  const count = images.length;

  function go(delta: number) {
    setIndex((current) => (current + delta + count) % count);
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

  const active = images[Math.min(index, count - 1)];

  return (
    <div
      className="relative select-none overflow-hidden rounded-2xl border border-white/10 bg-black"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={active} alt={alt ?? "Scroll photo"} draggable={false} className="max-h-[75vh] w-full object-contain" />

      <span className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-xs font-bold text-white">
        {index + 1}/{count}
      </span>

      <button
        type="button"
        aria-label="Previous photo"
        onClick={() => go(-1)}
        className="absolute left-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white/90 backdrop-blur transition hover:bg-black/70"
      >
        ‹
      </button>
      <button
        type="button"
        aria-label="Next photo"
        onClick={() => go(1)}
        className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white/90 backdrop-blur transition hover:bg-black/70"
      >
        ›
      </button>

      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
        {images.map((src, i) => (
          <button
            key={src + i}
            type="button"
            aria-label={`Photo ${i + 1}`}
            onClick={() => setIndex(i)}
            className={`h-2 w-2 rounded-full transition ${i === index ? "bg-white" : "bg-white/40 hover:bg-white/70"}`}
          />
        ))}
      </div>
    </div>
  );
}
