"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { usePlayer } from "@/components/player/PlayerProvider";
import { fetchPost } from "@/lib/api/scrolls";
import { readFreshSession } from "@/lib/auth/session";
import { claimSnippet, releaseSnippet } from "@/lib/audio/snippetCoordinator";
import type { FeaturedMusicLink } from "@/lib/music/featured";
import { parseMusicPost } from "@/lib/music/markers";

const SNIPPET_SECONDS = 15;

/**
 * Auto-plays a 15-second snippet of a photo post's attached song while the post
 * is in view, stopping when it scrolls away. Only one snippet plays at a time
 * (coordinator). The track audio is resolved lazily from the source music post.
 * Browser autoplay policies may block sound before a user gesture — if so, a
 * small "tap to play" affordance is shown instead.
 */
export function FeaturedAudioSnippet({
  targetRef,
  link
}: {
  targetRef: RefObject<HTMLElement | null>;
  link: FeaturedMusicLink;
}) {
  const player = usePlayer();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stopTimerRef = useRef<number | undefined>(undefined);
  const resolvedRef = useRef<{ done: boolean; url: string | null }>({ done: false, url: null });
  const [needsTap, setNeedsTap] = useState(false);
  // Track whether the main sticky player is active so we never overlap it.
  const playerActiveRef = useRef(false);
  playerActiveRef.current = Boolean(player.current && player.isPlaying);

  async function resolveAudio(): Promise<string | null> {
    if (resolvedRef.current.done) return resolvedRef.current.url;
    let url: string | null = null;
    try {
      const session = await readFreshSession();
      const post = await fetchPost(link.postID, session?.token);
      if (post) {
        const music = parseMusicPost(post.caption);
        const wanted = link.trackID
          ? music.tracks.find((t) => t.id.toLowerCase() === link.trackID!.toLowerCase())
          : null;
        url = wanted?.audioURL ?? music.tracks.find((t) => t.audioURL)?.audioURL ?? null;
      }
    } catch {
      url = null;
    }
    resolvedRef.current = { done: true, url };
    return url;
  }

  function stop() {
    window.clearTimeout(stopTimerRef.current);
    audioRef.current?.pause();
  }

  async function start() {
    if (playerActiveRef.current) return; // don't fight the main player
    const url = await resolveAudio();
    if (!url) return;
    let audio = audioRef.current;
    if (!audio) {
      audio = new Audio();
      audio.preload = "none";
      audioRef.current = audio;
    }
    claimSnippet(stop);
    if (audio.src !== url) audio.src = url;
    audio.currentTime = 0;
    try {
      await audio.play();
      setNeedsTap(false);
      stopTimerRef.current = window.setTimeout(stop, SNIPPET_SECONDS * 1000);
    } catch {
      setNeedsTap(true); // autoplay blocked — wait for a gesture
    }
  }

  useEffect(() => {
    const el = targetRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
          void start();
        } else {
          stop();
          releaseSnippet(stop);
          setNeedsTap(false);
        }
      },
      { threshold: [0, 0.6, 1] }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      stop();
      releaseSnippet(stop);
      const audio = audioRef.current;
      if (audio) audio.src = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetRef, link.postID, link.trackID]);

  if (!needsTap) return null;
  return (
    <button
      type="button"
      onClick={() => void start()}
      className="mt-3 flex items-center gap-2 rounded-full border border-scrolls-gold/40 bg-white/[0.05] px-3 py-1.5 text-xs font-bold text-white/80 transition hover:bg-white/10"
    >
      <span className="text-scrolls-gold">♪</span> Tap to play preview
    </button>
  );
}
