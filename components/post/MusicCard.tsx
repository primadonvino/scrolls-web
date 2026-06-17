"use client";

import { useMemo, useState } from "react";
import { postCoverURL } from "@/lib/media/urls";
import {
  formatDuration,
  formatReleaseDate,
  parseMusicPost,
  releaseTypeLabel,
  runtimeSummary,
  type MusicTrack
} from "@/lib/music/markers";
import type { ScrollsPost } from "@/lib/types/scrolls";

/**
 * Renders a music/podcast post as a rich card — cover art, release type, track
 * list with explicit badges + durations, inline audio playback, per-track
 * lyrics, liner notes, and a release-metadata footer. Read-only; no backend
 * support required (everything is parsed from the caption markers).
 */
export function MusicCard({ post }: { post: ScrollsPost }) {
  const music = useMemo(() => parseMusicPost(post.caption), [post.caption]);
  const cover = postCoverURL(post);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [lyricsTrackId, setLyricsTrackId] = useState<string | null>(null);

  const badge = music.isPodcast ? "🎙 Podcast" : "♪ Music";
  const typeLabel = releaseTypeLabel(music.releaseType);
  const runtime = music.tracks.length ? runtimeSummary(music.tracks) : null;
  const releaseDate = formatReleaseDate(music.releaseDate);
  const metaBits = [music.genre, music.recordLabel, releaseDate].filter(Boolean) as string[];

  const activeTrack = music.tracks.find((t) => t.id === activeTrackId) ?? null;
  const lyricsTrack = music.tracks.find((t) => t.id === lyricsTrackId) ?? null;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-scrolls-panel">
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt={music.title ?? "Cover art"} className="aspect-square w-full object-cover" />
      ) : music.loopVideoURL ? (
        <video
          src={music.loopVideoURL}
          className="aspect-square w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
        />
      ) : (
        <div className="grid aspect-square w-full place-items-center bg-gradient-to-br from-scrolls-panel2 to-black text-5xl">
          {music.isPodcast ? "🎙" : "♪"}
        </div>
      )}

      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-scrolls-gold">
          <span>{badge}</span>
          {typeLabel ? <span className="text-white/40">· {typeLabel}</span> : null}
        </div>

        {music.title ? <h3 className="mt-1 text-xl font-black leading-tight">{music.title}</h3> : null}

        {runtime || metaBits.length ? (
          <p className="mt-1 text-sm text-white/55">
            {[runtime, ...metaBits].filter(Boolean).join(" · ")}
          </p>
        ) : null}

        {music.tracks.length ? (
          <ol className="mt-4 space-y-1">
            {music.tracks.map((track, index) => (
              <TrackRow
                key={track.id || index}
                index={index + 1}
                track={track}
                isActive={track.id === activeTrackId}
                onPlay={track.audioURL ? () => setActiveTrackId(track.id) : undefined}
                hasLyrics={Boolean(track.lyrics)}
                lyricsOpen={track.id === lyricsTrackId}
                onToggleLyrics={
                  track.lyrics
                    ? () => setLyricsTrackId((current) => (current === track.id ? null : track.id))
                    : undefined
                }
              />
            ))}
          </ol>
        ) : null}

        {lyricsTrack?.lyrics ? (
          <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3">
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-white/45">
              Lyrics · {lyricsTrack.title}
            </p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/80">{lyricsTrack.lyrics}</p>
          </div>
        ) : null}

        {activeTrack?.audioURL ? (
          <div className="mt-3">
            <p className="mb-1 truncate text-xs text-white/50">Now playing · {activeTrack.title}</p>
            <audio key={activeTrack.id} src={activeTrack.audioURL} controls autoPlay className="w-full" />
          </div>
        ) : null}

        {music.linerNotes ? <LinerNotes notes={music.linerNotes} /> : null}
      </div>
    </div>
  );
}

function TrackRow({
  index,
  track,
  isActive,
  onPlay,
  hasLyrics,
  lyricsOpen,
  onToggleLyrics
}: {
  index: number;
  track: MusicTrack;
  isActive: boolean;
  onPlay?: () => void;
  hasLyrics: boolean;
  lyricsOpen: boolean;
  onToggleLyrics?: () => void;
}) {
  const duration = formatDuration(track.durationSeconds);
  return (
    <li
      className={`flex items-center gap-3 rounded-lg px-2 py-2 transition ${
        isActive ? "bg-white/10" : "hover:bg-white/[0.06]"
      }`}
    >
      <button
        type="button"
        onClick={onPlay}
        disabled={!onPlay}
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-bold text-white/70 transition enabled:hover:bg-scrolls-gold enabled:hover:text-black disabled:opacity-40"
        aria-label={onPlay ? `Play ${track.title}` : "No audio"}
      >
        {onPlay ? "▶" : index}
      </button>
      <span className="min-w-0 flex-1 truncate text-sm text-white/85">{track.title || `Track ${index}`}</span>
      {track.isExplicit ? (
        <span className="grid h-4 w-4 shrink-0 place-items-center rounded-[3px] bg-white/25 text-[9px] font-bold text-white" title="Explicit">
          E
        </span>
      ) : null}
      {hasLyrics ? (
        <button
          type="button"
          onClick={onToggleLyrics}
          className={`shrink-0 text-xs font-semibold ${lyricsOpen ? "text-scrolls-gold" : "text-white/45 hover:text-white/80"}`}
        >
          Lyrics
        </button>
      ) : null}
      {duration ? <span className="shrink-0 text-xs tabular-nums text-white/40">{duration}</span> : null}
    </li>
  );
}

function LinerNotes({ notes }: { notes: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4 border-t border-white/10 pt-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="text-sm font-bold text-white/70 hover:text-white"
      >
        {open ? "Hide liner notes" : "Liner notes"}
      </button>
      {open ? (
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-white/75">{notes}</p>
      ) : null}
    </div>
  );
}
