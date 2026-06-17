import type { ScrollsPost } from "@/lib/types/scrolls";

/**
 * Long-form article payload, a faithful TS port of iOS/Android
 * `ScrollArticlePayload`. Articles are TEXT posts whose body text begins with
 * `[ARTICLE_JSON]` followed by the JSON payload; the caption is `[ARTICLE]
 * {headline}`. Without this the raw JSON leaks into the feed.
 */

const WIRE_PREFIX = "[ARTICLE_JSON]";

export type ArticleBlockKind = "paragraph" | "subheadline" | "sectionHeading";

export type ArticleBlock = {
  id: string;
  kind: ArticleBlockKind;
  text: string;
};

export type ScrollArticle = {
  headline: string;
  blocks: ArticleBlock[];
  coverImageRef?: string | null;
  coverImageAspectRatio?: number | null;
};

function articleSourceText(post: ScrollsPost): string | null {
  return post.textBody ?? post.text_body ?? post.mediaPreview?.text?.cachedText ?? null;
}

/** Decodes the `[ARTICLE_JSON]…` payload from a post, or null if not an article. */
export function parseArticle(post: ScrollsPost): ScrollArticle | null {
  const source = articleSourceText(post);
  if (!source) return null;
  const trimmed = source.trim();
  if (!trimmed.startsWith(WIRE_PREFIX)) return null;
  try {
    const raw = JSON.parse(trimmed.slice(WIRE_PREFIX.length)) as Record<string, unknown>;
    const headline = typeof raw.headline === "string" ? raw.headline : "";
    const blocksRaw = Array.isArray(raw.blocks) ? raw.blocks : [];
    if (!headline || blocksRaw.length === 0) return null;
    const blocks: ArticleBlock[] = blocksRaw
      .map((entry: Record<string, unknown>) => ({
        id: String(entry.id ?? ""),
        kind: normalizeKind(entry.kind),
        text: typeof entry.text === "string" ? entry.text : ""
      }))
      .filter((block) => block.text.length > 0);
    if (blocks.length === 0) return null;
    return {
      headline,
      blocks,
      coverImageRef: (raw.coverImageRef as string | undefined) ?? null,
      coverImageAspectRatio:
        typeof raw.coverImageAspectRatio === "number" ? raw.coverImageAspectRatio : null
    };
  } catch {
    return null;
  }
}

function normalizeKind(value: unknown): ArticleBlockKind {
  if (value === "subheadline" || value === "sectionHeading") return value;
  return "paragraph";
}

export function isArticlePost(post: ScrollsPost): boolean {
  return parseArticle(post) != null;
}
