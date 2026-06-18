"use client";

import { useRef } from "react";

function formatEta(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 1) return "a few seconds left";
  if (seconds < 60) return `~${Math.ceil(seconds)}s left`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return secs ? `~${mins}m ${secs}s left` : `~${mins}m left`;
}

/** Thin upload progress bar with a live percent and estimated time remaining. */
export function UploadProgressBar({ value, label = "Uploading" }: { value: number; label?: string }) {
  const fraction = Math.min(1, Math.max(0, value));
  const pct = Math.round(fraction * 100);

  // Remember when this upload started so we can estimate the remaining time
  // from the current rate. Reset whenever a new upload begins (value -> 0).
  const startRef = useRef<number | null>(null);
  if (fraction <= 0) startRef.current = null;
  else if (startRef.current === null) startRef.current = Date.now();

  let eta: string | null = null;
  if (startRef.current !== null && fraction > 0.03 && fraction < 1) {
    const elapsed = (Date.now() - startRef.current) / 1000;
    eta = formatEta((elapsed * (1 - fraction)) / fraction);
  }

  return (
    <div className="mt-3">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-scrolls-blue transition-[width] duration-150" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 flex justify-between text-xs text-white/50">
        <span>{pct >= 100 ? "Finishing…" : `${label}… ${pct}%`}</span>
        {pct < 100 && eta ? <span>{eta}</span> : null}
      </p>
    </div>
  );
}
