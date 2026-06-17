"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { UploadProgressBar } from "@/components/compose/UploadProgressBar";
import { createArticlePost, type ArticleBlockInput } from "@/lib/api/scrolls";
import { readFreshSession } from "@/lib/auth/session";

const COVER_TYPES = ["image/jpeg", "image/png"];
const MAX_COVER_BYTES = 25 * 1024 * 1024;
const MAX_HEADLINE = 160;

type BlockKind = ArticleBlockInput["kind"];

type BlockDraft = { key: string; kind: BlockKind; text: string };

const KIND_OPTIONS: { value: BlockKind; label: string }[] = [
  { value: "paragraph", label: "Paragraph" },
  { value: "sectionHeading", label: "Section heading" },
  { value: "subheadline", label: "Subheadline" }
];

function newBlock(kind: BlockKind = "paragraph"): BlockDraft {
  return { key: crypto.randomUUID(), kind, text: "" };
}

/**
 * Composer for publishing a long-form magazine article with the same block
 * styles as the mobile app — paragraphs, section headings, and subheadlines —
 * encoded behind `[ARTICLE_JSON]`.
 */
export function ArticleComposer({ onPosted }: { onPosted: () => void }) {
  const [cover, setCover] = useState<File | null>(null);
  const [coverURL, setCoverURL] = useState<string | null>(null);
  const [headline, setHeadline] = useState("");
  const [blocks, setBlocks] = useState<BlockDraft[]>(() => [newBlock("paragraph")]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
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

  function updateBlock(key: string, patch: Partial<BlockDraft>) {
    setBlocks((current) => current.map((block) => (block.key === key ? { ...block, ...patch } : block)));
  }

  function addBlock(kind: BlockKind) {
    setBlocks((current) => [...current, newBlock(kind)]);
  }

  function removeBlock(key: string) {
    setBlocks((current) => (current.length <= 1 ? current : current.filter((block) => block.key !== key)));
  }

  function moveBlock(key: string, direction: -1 | 1) {
    setBlocks((current) => {
      const index = current.findIndex((block) => block.key === key);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  const filledBlocks = blocks.filter((block) => block.text.trim().length > 0);
  const canPost = !busy && Boolean(cover) && headline.trim().length > 0 && filledBlocks.length > 0;

  async function publish() {
    if (!cover) {
      setError("Add a cover image.");
      return;
    }
    const payloadBlocks: ArticleBlockInput[] = filledBlocks.map((block) => ({
      id: block.key,
      kind: block.kind,
      text: block.text
    }));
    if (!headline.trim() || !payloadBlocks.length) {
      setError("Add a headline and some content.");
      return;
    }
    const session = await readFreshSession();
    if (!session?.token || !session.user?.id) {
      setError("Your session expired. Please log in again.");
      return;
    }
    setBusy(true);
    setError(null);
    setProgress(0);
    try {
      await createArticlePost(
        { authorID: session.user.id, headline: headline.trim(), blocks: payloadBlocks, cover },
        session.token,
        setProgress
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
        <div className="space-y-3">
          {blocks.map((block, index) => (
            <div key={block.key} className="rounded-2xl border border-white/10 bg-black/30 p-3">
              <div className="mb-2 flex items-center gap-2">
                <select
                  value={block.kind}
                  onChange={(event) => updateBlock(block.key, { kind: event.target.value as BlockKind })}
                  className="rounded-lg border border-white/10 bg-black px-2 py-1.5 text-xs font-bold text-white outline-none focus:border-white/30"
                >
                  {KIND_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span className="flex-1" />
                <button
                  type="button"
                  onClick={() => moveBlock(block.key, -1)}
                  disabled={index === 0}
                  className="px-1.5 text-white/50 enabled:hover:text-white disabled:opacity-25"
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveBlock(block.key, 1)}
                  disabled={index === blocks.length - 1}
                  className="px-1.5 text-white/50 enabled:hover:text-white disabled:opacity-25"
                  aria-label="Move down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => removeBlock(block.key)}
                  disabled={blocks.length <= 1}
                  className="px-1.5 text-red-300/70 enabled:hover:text-red-300 disabled:opacity-25"
                  aria-label="Remove block"
                >
                  ✕
                </button>
              </div>
              <textarea
                value={block.text}
                onChange={(event) => updateBlock(block.key, { text: event.target.value })}
                placeholder={
                  block.kind === "sectionHeading"
                    ? "Section heading"
                    : block.kind === "subheadline"
                      ? "Subheadline"
                      : "Paragraph text"
                }
                rows={block.kind === "paragraph" ? 4 : 1}
                className={`w-full resize-none rounded-lg border border-white/10 bg-black px-3 py-2 text-white outline-none placeholder:text-white/30 focus:border-white/30 ${
                  block.kind === "sectionHeading"
                    ? "text-lg font-black"
                    : block.kind === "subheadline"
                      ? "text-base font-bold"
                      : "text-[15px] leading-relaxed"
                }`}
              />
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => addBlock("paragraph")}
            className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold text-white/80 hover:bg-white/10"
          >
            + Paragraph
          </button>
          <button
            type="button"
            onClick={() => addBlock("sectionHeading")}
            className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold text-white/80 hover:bg-white/10"
          >
            + Section heading
          </button>
          <button
            type="button"
            onClick={() => addBlock("subheadline")}
            className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold text-white/80 hover:bg-white/10"
          >
            + Subheadline
          </button>
        </div>
      </div>

      {busy ? <UploadProgressBar value={progress} /> : null}
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
