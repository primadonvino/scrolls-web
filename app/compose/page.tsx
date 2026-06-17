"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Avatar } from "@/components/Avatar";
import { ArticleComposer } from "@/components/compose/ArticleComposer";
import { MusicComposer } from "@/components/compose/MusicComposer";
import { PodcastComposer } from "@/components/compose/PodcastComposer";
import { SiteHeader } from "@/components/SiteHeader";
import { createMediaPost, createTextPost, uploadPostMedia } from "@/lib/api/scrolls";
import { readFreshSession, readSession } from "@/lib/auth/session";
import type { AuthSession } from "@/lib/types/scrolls";

type Mode = "text" | "photo" | "video" | "music" | "podcast" | "article";

const MAX_TEXT = 2000;
const MAX_CAPTION = 220;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const VIDEO_TYPES = ["video/mp4", "video/quicktime"];
const MAX_PHOTO_BYTES = 25 * 1024 * 1024;
const MAX_VIDEO_BYTES = 500 * 1024 * 1024;

export default function ComposePage() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(() => readSession());
  const [mode, setMode] = useState<Mode>("text");
  const [body, setBody] = useState("");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewURL, setPreviewURL] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    readFreshSession().then((fresh) => {
      if (!cancelled) setSession(fresh);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (previewURL?.startsWith("blob:")) URL.revokeObjectURL(previewURL);
    };
  }, [previewURL]);

  const user = session?.user;
  const displayName = user?.displayName ?? user?.display_name ?? user?.username ?? "Scrolls";

  function selectMode(next: Mode) {
    setMode(next);
    setError(null);
    setFile(null);
    setAspectRatio(null);
    if (previewURL?.startsWith("blob:")) URL.revokeObjectURL(previewURL);
    setPreviewURL(null);
  }

  function pickFile(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0];
    if (!picked) return;
    const allowed = mode === "photo" ? PHOTO_TYPES : VIDEO_TYPES;
    const maxBytes = mode === "photo" ? MAX_PHOTO_BYTES : MAX_VIDEO_BYTES;
    if (!allowed.includes(picked.type)) {
      setError(mode === "photo" ? "Choose a JPEG, PNG, or WebP image." : "Choose an MP4 or MOV video.");
      return;
    }
    if (picked.size > maxBytes) {
      setError(`File is too large (max ${mode === "photo" ? "25MB" : "500MB"}).`);
      return;
    }
    setError(null);
    setFile(picked);
    const url = URL.createObjectURL(picked);
    setPreviewURL(url);
    measureAspect(url, mode);
  }

  function measureAspect(url: string, kind: Mode) {
    if (kind === "photo") {
      const img = new Image();
      img.onload = () => setAspectRatio(img.naturalHeight ? img.naturalWidth / img.naturalHeight : null);
      img.src = url;
    } else if (kind === "video") {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => setAspectRatio(video.videoHeight ? video.videoWidth / video.videoHeight : null);
      video.src = url;
    }
  }

  async function publish(event: FormEvent) {
    event.preventDefault();
    const fresh = await readFreshSession();
    setSession(fresh);
    if (!fresh?.token || !fresh.user?.id) {
      router.push("/login");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (mode === "text") {
        const trimmed = body.trim();
        if (!trimmed) return;
        await createTextPost(fresh.user.id, trimmed, fresh.token);
      } else if (mode === "photo" || mode === "video") {
        if (!file) {
          setError("Choose a file to post.");
          return;
        }
        const uploaded = await uploadPostMedia(fresh.token, fresh.user.id, file);
        await createMediaPost(
          {
            authorID: fresh.user.id,
            type: mode,
            caption: caption.trim() || null,
            aspectRatio,
            asset: { provider: uploaded.provider, bucket: uploaded.bucket, objectKey: uploaded.objectKey }
          },
          fresh.token
        );
      }
      router.push("/feed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not publish your scroll.");
    } finally {
      setBusy(false);
    }
  }

  const canPost = (() => {
    if (busy || !user) return false;
    if (mode === "text") return body.trim().length > 0;
    return Boolean(file);
  })();

  return (
    <div>
      <SiteHeader />
      <section className="mx-auto max-w-2xl px-5 pb-16">
        <div className="mb-6">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-scrolls-gold">Create</p>
          <h1 className="mt-2 text-4xl font-black">New scroll</h1>
        </div>

        {!user ? (
          <div className="scrolls-glass rounded-[1.8rem] p-6">
            <p className="text-white/62">Log in to post a scroll.</p>
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="mt-5 rounded-full bg-white px-5 py-3 text-sm font-black text-black"
            >
              Log in
            </button>
          </div>
        ) : (
          <div className="scrolls-glass rounded-[1.8rem] p-5">
            <div className="flex items-center gap-3">
              <Avatar user={user} size={48} />
              <div className="min-w-0">
                <p className="truncate font-black">{displayName}</p>
                <p className="truncate text-sm text-white/55">@{user.username}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {(["text", "photo", "video", "music", "podcast", "article"] as Mode[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => selectMode(value)}
                  className={`rounded-full px-4 py-2 text-sm font-black capitalize transition ${
                    mode === value ? "bg-white text-black" : "border border-white/12 text-white/70 hover:bg-white/10"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>

            {mode === "music" ? (
              <MusicComposer onPosted={() => router.push("/feed")} />
            ) : mode === "podcast" ? (
              <PodcastComposer onPosted={() => router.push("/feed")} />
            ) : mode === "article" ? (
              <ArticleComposer onPosted={() => router.push("/feed")} />
            ) : (
            <form onSubmit={publish}>
            {mode === "text" ? (
              <>
                <textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value.slice(0, MAX_TEXT))}
                  placeholder="Write a scroll..."
                  rows={8}
                  className="mt-4 w-full resize-none rounded-3xl border border-white/10 bg-black px-4 py-3 text-base leading-7 text-white outline-none placeholder:text-white/30 focus:border-white/30"
                />
                <p className="mt-2 text-right text-xs text-white/40">{body.trim().length}/{MAX_TEXT}</p>
              </>
            ) : (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={(mode === "photo" ? PHOTO_TYPES : VIDEO_TYPES).join(",")}
                  onChange={pickFile}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4 flex min-h-[180px] w-full items-center justify-center rounded-3xl border border-dashed border-white/20 bg-black/40 text-sm font-bold text-white/60 transition hover:bg-black/60"
                >
                  {previewURL ? (
                    mode === "photo" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={previewURL} alt="" className="max-h-[420px] w-full rounded-3xl object-contain" />
                    ) : (
                      <video src={previewURL} controls className="max-h-[420px] w-full rounded-3xl" />
                    )
                  ) : (
                    `Tap to choose a ${mode}`
                  )}
                </button>
                <input
                  value={caption}
                  onChange={(event) => setCaption(event.target.value.slice(0, MAX_CAPTION))}
                  placeholder="Add a caption (optional)"
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/30"
                />
                <p className="mt-2 text-right text-xs text-white/40">{caption.length}/{MAX_CAPTION}</p>
              </>
            )}

            <div className="mt-4 flex items-center justify-end">
              <button
                type="submit"
                disabled={!canPost}
                className="rounded-full bg-scrolls-blue px-6 py-3 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? (mode === "text" ? "Posting..." : "Uploading...") : "Post scroll"}
              </button>
            </div>
            {error ? <p className="mt-4 text-sm text-red-200">{error}</p> : null}
            </form>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
