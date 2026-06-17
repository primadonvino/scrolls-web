"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { createArticlePost, type ArticleBlockInput } from "@/lib/api/scrolls";
import { readFreshSession } from "@/lib/auth/session";

const COVER_TYPES = ["image/jpeg", "image/png"];
const MAX_COVER_BYTES = 25 * 1024 * 1024;
const MAX_HEADLINE = 160;

/** Splits free-form body text into paragraph blocks (blank line = new block). */
function bodyToBlocks(body: string): ArticleBlockInput[] {
  return body
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((text) => ({ id: crypto.randomUUID(), kind: "paragraph" as const, text }));
}

/**
 * Composer for publishing a long-form magazine article — a headline, a cover
 * image, and a body that's split into paragraph blocks behind `[ARTICLE_JSON]`.
 */
export function ArticleComposer({ onPosted }: { onPosted: () => void }) {
  const [cover, setCover] = useState<File | null>(null);
  const [coverURL, setCoverURL] = useState<string | null>(null);
  const [headline, setHeadline] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

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

  const canPost = !busy && Boolean(cover) && headline.trim().length > 0 && body.trim().length > 0;

  async function publish() {
    if (!cover) {
      setError("Add a cover image.");
      return;
    }
    const blocks = bodyToBlocks(body);
    if (!headline.trim() || !blocks.length) {
      setError("Add a headline and some body text.");
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
      await createArticlePost(
        { authorID: session.user.id, headline: headline.trim(), blocks, cover },
        session.token
      );
      onPosted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not publish your article.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 space-y-5">
      <div>
        <p className="mb-2 text-sm font-bold text-white/70">Cover image</p>
        <input ref={coverInputRef} type="file" accept={COVER_TYPES.join(",")} onChange={pickCover} className="hidden" />
        <button
          type="button"
          onClick={() => coverInputRef.current?.click()}
          className="grid aspect-[16/9] w-full max-w-sm place-items-center overflow-hidden rounded-2xl border border-dashed border-white/20 bg-black/40 text-xs font-bold text-white/60 transition hover:bg-black/60"
        >
          {coverURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverURL} alt="Cover" className="h-full w-full object-cover" />
          ) : (
            "Choose cover image"
          )}
        </button>
      </div>

      <div>
        <p className="mb-2 text-sm font-bold text-white/70">Headline</p>
        <input
          value={headline}
          onChange={(event) => setHeadline(event.target.value.slice(0, MAX_HEADLINE))}
          placeholder="Article headline"
          className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-base font-bold text-white outline-none placeholder:text-white/30 focus:border-white/30"
        />
      </div>

      <div>
        <p className="mb-2 text-sm font-bold text-white/70">Body</p>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Write your article. Separate paragraphs with a blank line."
          rows={12}
          className="w-full resize-none rounded-2xl border border-white/10 bg-black px-4 py-3 text-[15px] leading-relaxed text-white/90 outline-none placeholder:text-white/30 focus:border-white/30"
        />
        <p className="mt-1 text-xs text-white/40">Blank lines start new paragraphs.</p>
      </div>

      {error ? <p className="text-sm text-red-200">{error}</p> : null}

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={publish}
          disabled={!canPost}
          className="rounded-full bg-scrolls-blue px-6 py-3 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Publishing..." : "Publish article"}
        </button>
      </div>
    </div>
  );
}
