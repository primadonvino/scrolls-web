"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { createPodcastPost } from "@/lib/api/scrolls";
import { readFreshSession } from "@/lib/auth/session";

const COVER_TYPES = ["image/jpeg", "image/png"];
const AUDIO_TYPES = ["audio/mpeg", "audio/mp3", "audio/mp4", "audio/x-m4a", "audio/m4a", "audio/aac", "audio/wav", "audio/x-wav"];
const MAX_COVER_BYTES = 25 * 1024 * 1024;
const MAX_AUDIO_BYTES = 200 * 1024 * 1024;
const MAX_CAPTION = 220;

/**
 * Composer for publishing a podcast episode. The audio is uploaded as the post
 * asset and the caption carries the `[PODCAST]` marker — mirroring the iOS
 * podcast flow, and playable via the sticky player's asset fallback.
 */
export function PodcastComposer({ onPosted }: { onPosted: () => void }) {
  const [cover, setCover] = useState<File | null>(null);
  const [coverURL, setCoverURL] = useState<string | null>(null);
  const [audio, setAudio] = useState<File | null>(null);
  const [title, setTitle] = useState("");
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

  function pickAudio(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0];
    event.target.value = "";
    if (!picked) return;
    if (!AUDIO_TYPES.includes(picked.type)) {
      setError("Choose an MP3, M4A, AAC, or WAV file.");
      return;
    }
    if (picked.size > MAX_AUDIO_BYTES) {
      setError("Audio is too large (max 200MB).");
      return;
    }
    setError(null);
    setAudio(picked);
  }

  const canPost = !busy && Boolean(cover) && Boolean(audio) && title.trim().length > 0;

  async function publish() {
    if (!cover || !audio) {
      setError("Add cover art and an audio file.");
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
      await createPodcastPost(
        { authorID: session.user.id, caption: title.trim() || null, cover, audio },
        session.token
      );
      onPosted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not publish your podcast.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 space-y-5">
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

      <div>
        <p className="mb-2 text-sm font-bold text-white/70">Episode title</p>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value.slice(0, MAX_CAPTION))}
          placeholder="Episode title"
          className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/30"
        />
      </div>

      <div>
        <p className="mb-2 text-sm font-bold text-white/70">Audio</p>
        <input ref={audioInputRef} type="file" accept={AUDIO_TYPES.join(",")} onChange={pickAudio} className="hidden" />
        <button
          type="button"
          onClick={() => audioInputRef.current?.click()}
          className="w-full rounded-2xl border border-dashed border-white/15 bg-black/30 p-4 text-center text-sm font-bold text-white/70 transition hover:bg-black/50"
        >
          {audio ? audio.name : "Choose an MP3, M4A, AAC, or WAV file"}
        </button>
      </div>

      {error ? <p className="text-sm text-red-200">{error}</p> : null}

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={publish}
          disabled={!canPost}
          className="rounded-full bg-scrolls-blue px-6 py-3 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Publishing..." : "Publish podcast"}
        </button>
      </div>
    </div>
  );
}
