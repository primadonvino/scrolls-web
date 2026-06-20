"use client";

import { ChevronDown, ChevronUp, Music, Pause, Play, SkipBack, SkipForward, X } from "lucide-react";
import { createContext, useCallback, useContext, useRef, useState } from "react";

export type PlayerTrack = {
  /** Stable id so the bar/queue can highlight the active track. */
  id: string;
  title: string;
  subtitle?: string | null;
  artworkURL?: string | null;
  audioURL: string;
  lyrics?: string | null;
};

type PlayerContextValue = {
  current: PlayerTrack | null;
  isPlaying: boolean;
  /** Play a single track (podcast / one-off audio). */
  play: (track: PlayerTrack) => void;
  /** Play an album/queue starting at an index, with prev/next + track list. */
  playQueue: (tracks: PlayerTrack[], startIndex?: number) => void;
  /** Queue a track to play right after the current one (starts it if idle). */
  playNext: (track: PlayerTrack) => void;
  toggle: () => void;
  close: () => void;
  expand: () => void;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within <PlayerProvider>.");
  return ctx;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * App-wide audio player. Holds a single <audio> element and the current queue,
 * so playback persists across navigation. Renders a sticky now-playing bar that
 * expands into a full now-playing view (artwork, scrubber, prev/next, queue,
 * lyrics) — matching the iOS/Android player.
 */
export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [queue, setQueue] = useState<PlayerTrack[]>([]);
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);

  const current = queue[index] ?? null;

  function start(tracks: PlayerTrack[], i: number) {
    const track = tracks[i];
    const audio = audioRef.current;
    if (!track || !audio) return;
    audio.src = track.audioURL;
    audio.play().catch(() => setIsPlaying(false));
  }

  const play = useCallback((track: PlayerTrack) => {
    setQueue([track]);
    setIndex(0);
    setShowLyrics(false);
    start([track], 0);
  }, []);

  const playQueue = useCallback((tracks: PlayerTrack[], startIndex = 0) => {
    if (!tracks.length) return;
    const i = Math.max(0, Math.min(tracks.length - 1, startIndex));
    setQueue(tracks);
    setIndex(i);
    setShowLyrics(false);
    start(tracks, i);
  }, []);

  const playNext = useCallback((track: PlayerTrack) => {
    setQueue((q) => {
      if (!q.length) {
        start([track], 0);
        return [track];
      }
      const at = Math.min(index + 1, q.length);
      return [...q.slice(0, at), track, ...q.slice(at)];
    });
  }, [index]);

  function goTo(i: number) {
    if (i < 0 || i >= queue.length) return;
    setIndex(i);
    setShowLyrics(false);
    start(queue, i);
  }

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    if (audio.paused) audio.play().catch(() => setIsPlaying(false));
    else audio.pause();
  }, [current]);

  function next() {
    if (index < queue.length - 1) goTo(index + 1);
  }

  function prev() {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    if (index > 0) goTo(index - 1);
  }

  const close = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    setQueue([]);
    setIndex(0);
    setIsPlaying(false);
    setProgress(0);
    setDuration(0);
    setExpanded(false);
  }, []);

  const expand = useCallback(() => setExpanded(true), []);

  function seek(event: React.ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    audio.currentTime = (Number(event.target.value) / 100) * duration;
  }

  const pct = duration ? Math.min(100, (progress / duration) * 100) : 0;
  const hasQueue = queue.length > 1;

  return (
    <PlayerContext.Provider value={{ current, isPlaying, play, playQueue, playNext, toggle, close, expand }}>
      {children}
      {current ? <div aria-hidden className="h-20" /> : null}

      <audio
        ref={audioRef}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => (index < queue.length - 1 ? goTo(index + 1) : setIsPlaying(false))}
        onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        className="hidden"
      />

      {/* Sticky bar */}
      {current ? (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-scrolls-panel/95 backdrop-blur-xl">
          <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2.5">
            <button type="button" onClick={expand} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label="Expand player">
              {current.artworkURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={current.artworkURL} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
              ) : (
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-black/40 text-white/70">
                  <Music size={18} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">{current.title}</p>
                {current.subtitle ? <p className="truncate text-xs text-white/55">{current.subtitle}</p> : null}
              </div>
            </button>
            <button
              type="button"
              onClick={toggle}
              aria-label={isPlaying ? "Pause" : "Play"}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-black"
            >
              {isPlaying ? <Pause size={16} className="fill-current" /> : <Play size={16} className="fill-current" />}
            </button>
            <button type="button" onClick={expand} aria-label="Expand player" className="grid h-8 w-8 shrink-0 place-items-center text-white/55 hover:text-white">
              <ChevronUp size={20} />
            </button>
            <button type="button" onClick={close} aria-label="Close player" className="grid h-8 w-8 shrink-0 place-items-center text-white/45 hover:text-white">
              <X size={18} />
            </button>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={pct}
            onChange={seek}
            aria-label="Seek"
            className="mb-1 h-1 w-full cursor-pointer accent-scrolls-gold"
          />
        </div>
      ) : null}

      {/* Expanded now-playing view */}
      {current && expanded ? (
        <div className="fixed inset-0 z-[70] overflow-y-auto bg-scrolls-black/95 backdrop-blur-2xl">
          <div className="mx-auto max-w-md px-6 pb-12 pt-5">
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => setExpanded(false)} aria-label="Collapse" className="grid h-9 w-9 place-items-center text-white/70 hover:text-white">
                <ChevronDown size={26} />
              </button>
              <button type="button" onClick={close} aria-label="Stop" className="text-sm font-bold text-white/55 hover:text-white">
                Close
              </button>
            </div>

            <div className="mt-4 aspect-square w-full overflow-hidden rounded-[1.6rem] border border-white/10 bg-black">
              {current.artworkURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={current.artworkURL} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center text-white/40">
                  <Music size={88} />
                </div>
              )}
            </div>

            <p className="mt-6 text-center text-xs font-bold uppercase tracking-[0.22em] text-white/45">Now Playing</p>
            <h2 className="mt-2 text-center text-2xl font-black leading-tight">{current.title}</h2>
            {current.subtitle ? <p className="mt-1 text-center text-sm text-white/55">{current.subtitle}</p> : null}
            {hasQueue ? <p className="mt-1 text-center text-xs text-white/40">Track {index + 1} of {queue.length}</p> : null}

            <input
              type="range"
              min={0}
              max={100}
              value={pct}
              onChange={seek}
              aria-label="Seek"
              className="mt-6 h-1.5 w-full cursor-pointer accent-scrolls-gold"
            />
            <div className="mt-1 flex justify-between text-xs tabular-nums text-white/50">
              <span>{formatTime(progress)}</span>
              <span>-{formatTime(Math.max(0, duration - progress))}</span>
            </div>

            <div className="mt-6 flex items-center justify-center gap-8">
              <button
                type="button"
                onClick={prev}
                disabled={!hasQueue}
                aria-label="Previous"
                className="grid h-12 w-12 place-items-center text-white/85 transition hover:text-white disabled:opacity-30"
              >
                <SkipBack size={30} className="fill-current" />
              </button>
              <button
                type="button"
                onClick={toggle}
                aria-label={isPlaying ? "Pause" : "Play"}
                className="grid h-16 w-16 place-items-center rounded-full bg-white text-black"
              >
                {isPlaying ? <Pause size={28} className="fill-current" /> : <Play size={28} className="fill-current" />}
              </button>
              <button
                type="button"
                onClick={next}
                disabled={index >= queue.length - 1}
                aria-label="Next"
                className="grid h-12 w-12 place-items-center text-white/85 transition hover:text-white disabled:opacity-30"
              >
                <SkipForward size={30} className="fill-current" />
              </button>
            </div>

            {current.lyrics ? (
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => setShowLyrics((value) => !value)}
                  className="text-sm font-bold text-scrolls-gold"
                >
                  {showLyrics ? "Hide lyrics" : "Lyrics"}
                </button>
                {showLyrics ? (
                  <p className="mt-2 whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/30 p-4 text-sm leading-relaxed text-white/80">
                    {current.lyrics}
                  </p>
                ) : null}
              </div>
            ) : null}

            {hasQueue ? (
              <div className="mt-8">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-white/45">Tracks</p>
                <ol className="space-y-1">
                  {queue.map((track, i) => (
                    <li key={track.id || i}>
                      <button
                        type="button"
                        onClick={() => goTo(i)}
                        className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition ${
                          i === index ? "bg-white/10" : "hover:bg-white/[0.06]"
                        }`}
                      >
                        <span className="w-5 text-center text-sm font-bold text-white/40">{i + 1}</span>
                        <span className={`min-w-0 flex-1 truncate text-sm ${i === index ? "text-white" : "text-white/80"}`}>
                          {track.title}
                        </span>
                        {i === index && isPlaying ? <Play size={13} className="fill-current text-scrolls-gold" /> : null}
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </PlayerContext.Provider>
  );
}
