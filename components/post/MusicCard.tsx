"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { usePlayer } from "@/components/player/PlayerProvider";
import { postCoverURL, postMediaURL } from "@/lib/media/urls";
import {
  creditLabel,
  formatDuration,
  formatReleaseDate,
  parseMusicPost,
  releaseTypeLabel,
  runtimeSummary,
  type MusicTrack,
  type MusicTrackCredit
} from "@/lib/music/markers";
import type { ScrollsPost, ScrollsUser } from "@/lib/types/scrolls";

/** Lead artist (post author) as a credit-shaped value for the artist line. */
type LeadArtist = { label: string; username?: string };

/**
 * Renders a music/podcast post as a rich card — cover art, release type, track
 * list with explicit badges, per-track artist credits (lead first, then
 * collaborators), durations, inline playback, lyrics, a per-track options menu
 * (Apple Music-style), and a View Credits sheet. Parsed entirely from the
 * caption markers; older posts without collaborator credits render unchanged.
 */
export function MusicCard({ post }: { post: ScrollsPost }) {
  const music = useMemo(() => parseMusicPost(post.caption), [post.caption]);
  const cover = postCoverURL(post);
  const player = usePlayer();
  const [lyricsTrackId, setLyricsTrackId] = useState<string | null>(null);
  const [optionsTrack, setOptionsTrack] = useState<MusicTrack | null>(null);
  const [creditsTrack, setCreditsTrack] = useState<MusicTrack | null>(null);

  const badge = music.isPodcast ? "🎙 Podcast" : "♪ Music";
  const typeLabel = releaseTypeLabel(music.releaseType);
  const runtime = music.tracks.length ? runtimeSummary(music.tracks) : null;
  const releaseDate = formatReleaseDate(music.releaseDate);
  const metaBits = [music.genre, music.recordLabel, releaseDate].filter(Boolean) as string[];

  const activeTrackId = player.current?.id ?? null;
  const lyricsTrack = music.tracks.find((t) => t.id === lyricsTrackId) ?? null;
  const hasTrackAudio = music.tracks.some((t) => t.audioURL);
  const fallbackAudioURL = !hasTrackAudio ? postMediaURL(post) : null;

  const author = post.author ?? post.user;
  const username = author?.username;
  const leadName = author?.displayName ?? author?.display_name ?? (username ? `@${username}` : "Artist");
  const lead: LeadArtist = { label: leadName, username };
  const subtitle = [username ? `@${username}` : null, music.title ?? (music.isPodcast ? "Podcast" : "Music")]
    .filter(Boolean)
    .join(" · ");

  function playFallback() {
    if (!fallbackAudioURL) return;
    player.play({
      id: post.id,
      title: music.title ?? (music.isPodcast ? "Podcast" : "Audio"),
      subtitle: music.isPodcast ? "Podcast" : "Music",
      artworkURL: cover,
      audioURL: fallbackAudioURL
    });
  }

  function playerTrack(track: MusicTrack) {
    return {
      id: track.id,
      title: track.title,
      subtitle,
      artworkURL: cover,
      audioURL: track.audioURL as string,
      lyrics: track.lyrics ?? null
    };
  }

  function playTrack(track: MusicTrack) {
    if (!track.audioURL) return;
    const playable = music.tracks.filter((t) => t.audioURL);
    const startIndex = playable.findIndex((t) => t.id === track.id);
    if (startIndex < 0) return;
    player.playQueue(playable.map(playerTrack), startIndex);
  }

  function playNext(track: MusicTrack) {
    if (track.audioURL) player.playNext(playerTrack(track));
    setOptionsTrack(null);
  }

  async function shareTrack(track: MusicTrack) {
    setOptionsTrack(null);
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/scroll/${post.id}`;
    const title = `${track.title || music.title || "Scrolls"} on Scrolls`;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        /* user cancelled */
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        /* ignore */
      }
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-scrolls-panel">
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt={music.title ?? "Cover art"} className="aspect-square w-full object-cover" />
      ) : music.loopVideoURL ? (
        <video src={music.loopVideoURL} className="aspect-square w-full object-cover" autoPlay muted loop playsInline />
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
          <p className="mt-1 text-sm text-white/55">{[runtime, ...metaBits].filter(Boolean).join(" · ")}</p>
        ) : null}

        {music.tracks.length ? (
          <ol className="mt-4 space-y-1">
            {music.tracks.map((track, index) => (
              <TrackRow
                key={track.id || index}
                index={index + 1}
                track={track}
                lead={lead}
                isActive={track.id === activeTrackId}
                onPlay={track.audioURL ? () => playTrack(track) : undefined}
                hasLyrics={Boolean(track.lyrics)}
                lyricsOpen={track.id === lyricsTrackId}
                onToggleLyrics={
                  track.lyrics
                    ? () => setLyricsTrackId((current) => (current === track.id ? null : track.id))
                    : undefined
                }
                onOptions={() => setOptionsTrack(track)}
              />
            ))}
          </ol>
        ) : null}

        {fallbackAudioURL ? (
          <button
            type="button"
            onClick={playFallback}
            className={`mt-4 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${
              activeTrackId === post.id ? "bg-scrolls-gold text-black" : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            <span className="text-base leading-none">▶</span>
            {activeTrackId === post.id ? "Playing" : music.isPodcast ? "Play episode" : "Play"}
          </button>
        ) : null}

        {lyricsTrack?.lyrics ? (
          <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3">
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-white/45">Lyrics · {lyricsTrack.title}</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/80">{lyricsTrack.lyrics}</p>
          </div>
        ) : null}

        {music.linerNotes ? <LinerNotes notes={music.linerNotes} /> : null}
      </div>

      {optionsTrack ? (
        <TrackOptionsSheet
          track={optionsTrack}
          canPlayNext={Boolean(optionsTrack.audioURL)}
          onClose={() => setOptionsTrack(null)}
          onShare={() => shareTrack(optionsTrack)}
          onPlayNext={() => playNext(optionsTrack)}
          onViewCredits={() => {
            setCreditsTrack(optionsTrack);
            setOptionsTrack(null);
          }}
        />
      ) : null}

      {creditsTrack ? (
        <CreditsSheet
          track={creditsTrack}
          leadUser={author}
          leadLabel={leadName}
          onClose={() => setCreditsTrack(null)}
        />
      ) : null}
    </div>
  );
}

/** Renders the artist line: lead first, then collaborators, names navigable. */
function ArtistLine({ lead, collaborators }: { lead: LeadArtist; collaborators: MusicTrackCredit[] }) {
  const parts: LeadArtist[] = [lead, ...collaborators.map((c) => ({ label: creditLabel(c), username: c.username }))];
  return (
    <p className="truncate text-xs text-white/45">
      {parts.map((part, i) => (
        <span key={`${part.username ?? part.label}-${i}`}>
          {i > 0 ? <span className="text-white/30">{i === parts.length - 1 ? " & " : ", "}</span> : null}
          {part.username ? (
            <Link href={`/user/${encodeURIComponent(part.username)}`} className="hover:text-white/70 hover:underline">
              {part.label}
            </Link>
          ) : (
            part.label
          )}
        </span>
      ))}
    </p>
  );
}

function TrackRow({
  index,
  track,
  lead,
  isActive,
  onPlay,
  hasLyrics,
  lyricsOpen,
  onToggleLyrics,
  onOptions
}: {
  index: number;
  track: MusicTrack;
  lead: LeadArtist;
  isActive: boolean;
  onPlay?: () => void;
  hasLyrics: boolean;
  lyricsOpen: boolean;
  onToggleLyrics?: () => void;
  onOptions: () => void;
}) {
  const duration = formatDuration(track.durationSeconds);
  const collaborators = track.collaboratorCredits ?? [];
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
      <div className="min-w-0 flex-1">
        <span className="block truncate text-sm text-white/85">{track.title || `Track ${index}`}</span>
        {collaborators.length ? <ArtistLine lead={lead} collaborators={collaborators} /> : null}
      </div>
      {track.isExplicit ? (
        <span
          className="grid h-4 w-4 shrink-0 place-items-center rounded-[3px] bg-white/25 text-[9px] font-bold text-white"
          title="Explicit"
        >
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
      <button
        type="button"
        onClick={onOptions}
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-white/45 transition hover:bg-white/10 hover:text-white"
        aria-label={`Options for ${track.title}`}
      >
        ⋯
      </button>
    </li>
  );
}

/** Apple Music-style options overlay for a track. */
function TrackOptionsSheet({
  track,
  canPlayNext,
  onClose,
  onShare,
  onPlayNext,
  onViewCredits
}: {
  track: MusicTrack;
  canPlayNext: boolean;
  onClose: () => void;
  onShare: () => void;
  onPlayNext: () => void;
  onViewCredits: () => void;
}) {
  return (
    <SheetBackdrop onClose={onClose}>
      <p className="mb-3 truncate px-2 text-sm font-black text-white">{track.title || "Track"}</p>
      <div className="space-y-1">
        <SheetItem label="Add" sublabel="Soon" disabled />
        <SheetItem label="Favorite" sublabel="Soon" disabled />
        <SheetItem label="Share" onClick={onShare} />
        <SheetItem label="Add to Playlist" sublabel="Soon" disabled />
        <SheetItem label="Play Next" onClick={onPlayNext} disabled={!canPlayNext} />
        <SheetItem label="View Credits" onClick={onViewCredits} />
      </div>
    </SheetBackdrop>
  );
}

/** Credits sheet — lead artist first, then collaborators, all navigable. */
function CreditsSheet({
  track,
  leadUser,
  leadLabel,
  onClose
}: {
  track: MusicTrack;
  leadUser?: ScrollsUser;
  leadLabel: string;
  onClose: () => void;
}) {
  const collaborators = track.collaboratorCredits ?? [];
  return (
    <SheetBackdrop onClose={onClose}>
      <p className="mb-1 px-2 text-xs font-bold uppercase tracking-[0.18em] text-scrolls-gold">Credits</p>
      <p className="mb-3 truncate px-2 text-sm font-black text-white">{track.title || "Track"}</p>
      <div className="space-y-1">
        <CreditRow user={leadUser} label={leadLabel} username={leadUser?.username} role="Main artist" />
        {collaborators.map((credit) => (
          <CreditRow
            key={credit.userID || credit.username}
            user={{ id: credit.userID, username: credit.username, displayName: credit.displayName }}
            label={creditLabel(credit)}
            username={credit.username}
            role="Featured"
          />
        ))}
      </div>
    </SheetBackdrop>
  );
}

function CreditRow({
  user,
  label,
  username,
  role
}: {
  user?: ScrollsUser;
  label: string;
  username?: string;
  role: string;
}) {
  const inner = (
    <div className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-white/10">
      <Avatar user={user} size={40} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-white">{label}</p>
        <p className="truncate text-xs text-white/45">
          {role}
          {username ? ` · @${username}` : ""}
        </p>
      </div>
    </div>
  );
  return username ? (
    <Link href={`/user/${encodeURIComponent(username)}`} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
}

function SheetBackdrop({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-sm rounded-3xl border border-white/10 bg-scrolls-panel p-3 shadow-glow"
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function SheetItem({
  label,
  sublabel,
  onClick,
  disabled
}: {
  label: string;
  sublabel?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-bold text-white/85 transition enabled:hover:bg-white/10 disabled:cursor-not-allowed disabled:text-white/35"
    >
      <span>{label}</span>
      {sublabel ? <span className="text-xs font-semibold uppercase tracking-wide text-white/30">{sublabel}</span> : null}
    </button>
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
      {open ? <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-white/75">{notes}</p> : null}
    </div>
  );
}
