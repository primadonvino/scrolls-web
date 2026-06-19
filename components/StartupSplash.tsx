"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

// useLayoutEffect on the client (runs before paint so a repeat-load skip never
// flashes), useEffect on the server to avoid the SSR warning.
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;
const SESSION_KEY = "scrolls.splash.shown";

/**
 * Startup animation mirroring the iOS `ScrollsPreloadView`: the cursive
 * "Scrolls" wordmark is "written" left-to-right over ~2.35s with a small
 * pen-tip dot riding the leading edge, then the overlay fades into the app.
 * Shows once per tab session (like a cold launch), is theme-aware via the same
 * CSS variables as the app, and collapses to a quick fade under reduced motion.
 */
export function StartupSplash() {
  const [visible, setVisible] = useState(true);
  const skipped = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useIsoLayoutEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY)) {
        skipped.current = true;
        setVisible(false);
        return;
      }
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // sessionStorage unavailable (private mode / SSR) — just show it.
    }
  }, []);

  useEffect(() => {
    if (skipped.current) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const timer = window.setTimeout(() => setVisible(false), reduce ? 1400 : 2950);

    // Startup chime — mirrors iOS `ScrollsPreloadAudio`. Browsers may block
    // autoplay on a first visit with no prior interaction; if so, arm the first
    // user gesture to play it instead. We never pause it, so it finishes even
    // after the overlay fades.
    const audio = new Audio("/scrolls-startup.mp3");
    audio.volume = 0.7;
    audioRef.current = audio;
    const onGesture = () => {
      audio.play().catch(() => {});
      removeGesture();
    };
    const removeGesture = () => {
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
    };
    audio.play().catch(() => {
      window.addEventListener("pointerdown", onGesture);
      window.addEventListener("keydown", onGesture);
    });

    return () => {
      window.clearTimeout(timer);
      removeGesture();
    };
  }, []);

  if (!visible) return null;

  return (
    <div id="scrolls-splash" aria-hidden onClick={() => setVisible(false)}>
      <div className="scrolls-splash-wrap">
        <span className="scrolls-wordmark scrolls-splash-mark">Scrolls</span>
        <span className="scrolls-splash-pen" />
      </div>
    </div>
  );
}
