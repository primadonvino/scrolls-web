"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { createMusicPost, type MusicTrackUpload } from "@/lib/api/scrolls";
import { readFreshSession } from "@/lib/auth/session";
import { MUSIC_GENRES, RELEASE_TYPE_OPTIONS, type MusicReleaseType } from "@/lib/music/markers";

const COVER_TYPES = ["image/jpeg", "image/png"];
const AUDIO_TYPES = ["audio/mpeg", "audio/mp3", "audio/mp4", "audio/x-m4a", "audio/m4a", "audio/aac", "audio/wav", "audio/x-wav"];
const MAX_COVER_BYTES = 25 * 1024 * 1024;
const MAX_AUDIO_BYTES = 60 * 1024 * 1024;
const MAX_CAPTION = 220;

type TrackDraft = {
  key: string;
  file: File;
  title: string;
  isExplicit: boolean;
  lyrics: string;
  durationSeconds: number | null;
};

/** Reads an audio file's duration (seconds) via a throwaway <audio> element. */
function readAudioDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const value = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : null;
      URL.revokeObjectURL(url);
      resolve(value);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    audio.src = url;
  });
}

/**
 * Composer for publishing a music post (single / EP / album). Uploads cover art
 * + per-track audio through the existing R2 upload-token flow and assembles the
 * iOS-compatible `[MUSIC] …` caption markers — no new backend support needed.
 */
export function MusicComposer({ onPosted }: { onPosted: () => void }) {
  const [cover, setCover] = useState<File | null>(null);
  const [coverURL, setCoverURL] = useState<string | null>(null);
  const [releaseType, setReleaseType] = useState<MusicReleaseType>("album");
  const [tracks, setTracks] = useState<TrackDraft[]>([]);
  const [caption, setCaption] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [recordLabel, setRecordLabel] = useState("");
  const [genre, setGenre] = useState("");
  const [linerNotes, setLinerNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);

  function pickCover(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0];
    event.target.value = "";
    if (!picked) return;
    if (!COVER_TYPES.includes(picked.type)) {
      setError("Cover art must be a JPEG or PNG image.");
      return;
    }
    if (picked.size > MAX_COVER_BYTES) {
      setError("Cover art is too large (max 25MB).");
      return;
    }
    setError(null);
    if (coverURL) URL.revokeObjectURL(coverURL);
    setCover(picked);
    setCoverURL(URL.createObjectURL(picked));
  }

  async function pickAudio(event: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!picked.length) return;
    const valid: File[] = [];
    for (const file of picked) {
      if (!AUDIO_TYPES.includes(file.type)) {
        setError(`"${file.name}" is not a supported audio format (MP3, M4A, AAC, WAV).`);
        continue;
      }
      if (file.size > MAX_AUDIO_BYTES) {
        setError(`"${file.name}" is too large (max 60MB).`);
        continue;
      }
      valid.push(file);
    }
    if (!valid.length) return;
    setError(null);
    const drafts = await Promise.all(
      valid.map(async (file) => ({
        key: crypto.randomUUID(),
        file,
        title: file.name.replace(/\.[^.]+$/, ""),
        isExplicit: false,
        lyrics: "",
        durationSeconds: await readAudioDuration(file)
      }))
    );
    setTracks((current) => [...current, ...drafts]);
  }

  function updateTrack(key: string, patch: Partial<TrackDraft>) {
    setTracks((current) => current.map((track) => (track.key === key ? { ...track, ...patch } : track)));
  }

  function removeTrack(key: string) {
    setTracks((current) => current.filter((track) => track.key !== key));
  }

  function moveTrack(key: string, direction: -1 | 1) {
    setTracks((current) => {
      const index = current.findIndex((track) => track.key === key);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  const canPost = !busy && Boolean(cover) && tracks.length > 0 && tracks.every((t) => t.title.trim().length > 0);

  async function publish() {
    if (!cover || !tracks.length) {
      setError("Add cover art and at least one track.");
      return;
    }
    const session = await readFreshSession();
    if (!session?.token || !session.user?.id) {
      setError("Your session expired. Please log in again.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const uploads: MusicTrackUpload[] = tracks.map((track) => ({
        file: track.file,
        title: track.title,
        isExplicit: track.isExplicit,
        lyrics: track.lyrics,
        durationSeconds: track.durationSeconds
      }));
      await createMusicPost(
        {
          authorID: session.user.id,
          caption: caption.trim() || null,
          releaseType,
          releaseDate: releaseDate || null,
          recordLabel: recordLabel.trim() || null,
          genre: genre || null,
          linerNotes: linerNotes.trim() || null,
          cover,
          tracks: uploads
        },
        session.token
      );
      onPosted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not publish your release.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 space-y-5">
      {/* Cover art */}
      <div>
        <p className="mb-2 text-sm font-bold text-white/70">Cover art</p>
        <input ref={coverInputRef} type="file" accept={COVER_TYPES.join(",")} onChange={pickCover} className="hidden" />
        <button
          type="button"
          onClick={() => coverInputRef.current?.click()}
          className="grid aspect-square w-40 place-items-center overflow-hidden rounded-2xl border border-dashed border-white/20 bg-black/40 text-xs font-bold text-white/60 transition hover:bg-black/60"
        >
          {coverURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverURL} alt="Cover art" className="h-full w-full object-cover" />
          ) : (
            "Choose cover"
          )}
        </button>
      </div>

      {/* Release type */}
      <div>
        <p className="mb-2 text-sm font-bold text-white/70">Release type</p>
        <div className="flex gap-2">
          {RELEASE_TYPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setReleaseType(option.value)}
              className={`rounded-full px-4 py-2 text-sm font-black transition ${
                releaseType === option.value ? "bg-white text-black" : "border border-white/12 text-white/70 hover:bg-white/10"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Title / caption */}
      <div>
        <p className="mb-2 text-sm font-bold text-white/70">Title</p>
        <input
          value={caption}
          onChange={(event) => setCaption(event.target.value.slice(0, MAX_CAPTION))}
          placeholder="Release title"
          className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/30"
        />
      </div>

      {/* Tracks */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-bold text-white/70">Tracks</p>
          <input ref={audioInputRef} type="file" accept={AUDIO_TYPES.join(",")} multiple onChange={pickAudio} className="hidden" />
          <button
            type="button"
            onClick={() => audioInputRef.current?.click()}
            className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold text-white/80 hover:bg-white/10"
          >
            + Add audio
          </button>
        </div>
        {tracks.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/15 bg-black/30 p-4 text-center text-sm text-white/45">
            Add MP3, M4A, AAC, or WAV files.
          </p>
        ) : (
          <ol className="space-y-2">
            {tracks.map((track, index) => (
              <li key={track.key} className="rounded-2xl border border-white/10 bg-black/30 p-3">
                <div className="flex items-center gap-2">
                  <span className="w-5 text-center text-sm font-bold text-white/40">{index + 1}</span>
                  <input
                    value={track.title}
                    onChange={(event) => updateTrack(track.key, { title: event.target.value })}
                    placeholder="Track title"
                    className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/30"
                  />
                  <button
                    type="button"
                    onClick={() => moveTrack(track.key, -1)}
                    disabled={index === 0}
                    className="px-1.5 text-white/50 enabled:hover:text-white disabled:opacity-25"
                    aria-label="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveTrack(track.key, 1)}
                    disabled={index === tracks.length - 1}
                    className="px-1.5 text-white/50 enabled:hover:text-white disabled:opacity-25"
                    aria-label="Move down"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeTrack(track.key)}
                    className="px-1.5 text-red-300/70 hover:text-red-300"
                    aria-label="Remove track"
                  >
                    ✕
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-3 pl-7">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-white/60">
                    <input
                      type="checkbox"
                      checked={track.isExplicit}
                      onChange={(event) => updateTrack(track.key, { isExplicit: event.target.checked })}
                    />
                    Explicit
                  </label>
                  {track.durationSeconds ? (
                    <span className="text-xs text-white/35">
                      {Math.floor(track.durationSeconds / 60)}:
                      {Math.round(track.durationSeconds % 60).toString().padStart(2, "0")}
                    </span>
                  ) : null}
                </div>
                <textarea
                  value={track.lyrics}
                  onChange={(event) => updateTrack(track.key, { lyrics: event.target.value })}
                  placeholder="Lyrics (optional)"
                  rows={2}
                  className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white/85 outline-none placeholder:text-white/30 focus:border-white/30"
                />
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Release metadata */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-bold text-white/70">Release date</p>
          <input
            type="date"
            value={releaseDate}
            onChange={(event) => setReleaseDate(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none focus:border-white/30"
          />
        </div>
        <div>
          <p className="mb-2 text-sm font-bold text-white/70">Genre</p>
          <select
            value={genre}
            onChange={(event) => setGenre(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none focus:border-white/30"
          >
            <option value="">No genre</option>
            {MUSIC_GENRES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-bold text-white/70">Record label</p>
        <input
          value={recordLabel}
          onChange={(event) => setRecordLabel(event.target.value)}
          placeholder="Label (optional)"
          className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/30"
        />
      </div>

      <div>
        <p className="mb-2 text-sm font-bold text-white/70">Liner notes</p>
        <textarea
          value={linerNotes}
          onChange={(event) => setLinerNotes(event.target.value)}
          placeholder="Liner notes (optional)"
          rows={3}
          className="w-full resize-none rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white/85 outline-none placeholder:text-white/30 focus:border-white/30"
        />
      </div>

      {error ? <p className="text-sm text-red-200">{error}</p> : null}

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={publish}
          disabled={!canPost}
          className="rounded-full bg-scrolls-blue px-6 py-3 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Publishing..." : "Publish release"}
        </button>
      </div>
    </div>
  );
}
