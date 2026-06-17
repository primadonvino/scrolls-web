"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

export type PlayerTrack = {
  /** Stable id so the bar can highlight the active track. */
  id: string;
  title: string;
  subtitle?: string | null;
  artworkURL?: string | null;
  audioURL: string;
};

type PlayerContextValue = {
  current: PlayerTrack | null;
  isPlaying: boolean;
  play: (track: PlayerTrack) => void;
  toggle: () => void;
  close: () => void;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within <PlayerProvider>.");
  return ctx;
}

/**
 * App-wide audio player. Holds a single <audio> element so playback persists as
 * the user navigates, and renders a sticky now-playing bar at the bottom —
 * matching the iOS/Android mini-player for music and podcasts.
 */
export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [current, setCurrent] = useState<PlayerTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const play = useCallback((track: PlayerTrack) => {
    setCurrent(track);
    const audio = audioRef.current;
    if (audio) {
      audio.src = track.audioURL;
      audio.play().catch(() => setIsPlaying(false));
    }
  }, []);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    if (audio.paused) audio.play().catch(() => setIsPlaying(false));
    else audio.pause();
  }, [current]);

  const close = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    setCurrent(null);
    setIsPlaying(false);
    setProgress(0);
    setDuration(0);
  }, []);

  function seek(event: React.ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    audio.currentTime = (Number(event.target.value) / 100) * duration;
  }

  return (
    <PlayerContext.Provider value={{ current, isPlaying, play, toggle, close }}>
      {children}
      {current ? <div aria-hidden className="h-20" /> : null}
      <audio
        ref={audioRef}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        className="hidden"
      />
      {current ? (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-scrolls-panel/95 backdrop-blur-xl">
          <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2.5">
            {current.artworkURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={current.artworkURL} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
            ) : (
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-black/40 text-lg">♪</div>
            )}
            <button
              type="button"
              onClick={toggle}
              aria-label={isPlaying ? "Pause" : "Play"}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-black"
            >
              {isPlaying ? "❚❚" : "▶"}
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">{current.title}</p>
              {current.subtitle ? <p className="truncate text-xs text-white/55">{current.subtitle}</p> : null}
              <input
                type="range"
                min={0}
                max={100}
                value={duration ? Math.min(100, (progress / duration) * 100) : 0}
                onChange={seek}
                aria-label="Seek"
                className="mt-1 h-1 w-full cursor-pointer accent-scrolls-gold"
              />
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Close player"
              className="shrink-0 px-2 text-white/50 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      ) : null}
    </PlayerContext.Provider>
  );
}
