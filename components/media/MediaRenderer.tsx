import { postMediaURL } from "@/lib/media/urls";
import type { ScrollsPost } from "@/lib/types/scrolls";

export function MediaRenderer({ post }: { post: ScrollsPost }) {
  const url = postMediaURL(post);
  const type = post.mediaPreview?.type ?? post.type;
  const text = post.textBody ?? post.text_body ?? post.mediaPreview?.text?.cachedText;

  if (type === "text" || (!url && text)) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-2xl font-semibold leading-tight">
        {text || post.caption || "Text scroll"}
      </div>
    );
  }

  if (!url) {
    return (
      <div className="grid aspect-[4/5] place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/50">
        Media unavailable
      </div>
    );
  }

  if (type === "video" || /\.mp4($|\?)/i.test(url)) {
    return (
      <video
        src={url}
        controls
        playsInline
        className="max-h-[75vh] w-full rounded-2xl border border-white/10 bg-black object-contain"
      />
    );
  }

  if (type === "audio" || /\.(m4a|mp3|wav)($|\?)/i.test(url)) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <audio src={url} controls className="w-full" />
      </div>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={post.caption ?? "Scroll media"} className="max-h-[75vh] w-full rounded-2xl object-contain" />;
}
