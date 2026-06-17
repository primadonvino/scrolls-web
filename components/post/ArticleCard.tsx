import { parseArticle } from "@/lib/article/article";
import { normalizedAssetURL, postCoverURL } from "@/lib/media/urls";
import type { ScrollsPost } from "@/lib/types/scrolls";

/**
 * Renders a long-form article post (headline + cover + structured blocks)
 * instead of dumping the raw `[ARTICLE_JSON]` payload into the feed.
 */
export function ArticleCard({ post }: { post: ScrollsPost }) {
  const article = parseArticle(post);
  if (!article) return null;
  const cover = normalizedAssetURL(article.coverImageRef) ?? postCoverURL(post);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-scrolls-panel">
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt={article.headline} className="max-h-[420px] w-full object-cover" />
      ) : null}
      <div className="p-5">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-scrolls-gold">Article</p>
        <h3 className="mt-1 text-2xl font-black leading-tight">{article.headline}</h3>
        <div className="mt-4 space-y-3">
          {article.blocks.map((block) => {
            if (block.kind === "sectionHeading") {
              return (
                <h4 key={block.id} className="pt-1 text-lg font-black text-white">
                  {block.text}
                </h4>
              );
            }
            if (block.kind === "subheadline") {
              return (
                <p key={block.id} className="text-base font-bold text-white/85">
                  {block.text}
                </p>
              );
            }
            return (
              <p key={block.id} className="whitespace-pre-wrap text-[15px] leading-relaxed text-white/80">
                {block.text}
              </p>
            );
          })}
        </div>
      </div>
    </div>
  );
}
