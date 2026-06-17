import type { Metadata } from "next";
import { AppCTA } from "@/components/AppCTA";
import { AppSmartBanner } from "@/components/AppSmartBanner";
import { PostCard } from "@/components/post/PostCard";
import { SiteHeader } from "@/components/SiteHeader";
import { fetchPost } from "@/lib/api/scrolls";
import { postCoverURL, postMediaURL } from "@/lib/media/urls";
import type { ScrollsPost } from "@/lib/types/scrolls";

type Params = { params: Promise<{ postId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { postId } = await params;
  try {
    const post = await fetchPost(postId);
    const author = post?.author ?? post?.user;
    const displayName = author?.displayName ?? author?.display_name ?? author?.username ?? "Scrolls";
    const username = author?.username ? `@${author.username}` : "Scrolls";
    const caption = post?.caption?.trim();
    const description = caption || `View this scroll from ${username}.`;
    const image = post ? postCoverURL(post) ?? postMediaURL(post) ?? undefined : undefined;
    return {
      title: `${displayName} on Scrolls`,
      description,
      openGraph: {
        title: `${displayName} on Scrolls`,
        description,
        images: image ? [{ url: image }] : undefined
      },
      twitter: {
        card: image ? "summary_large_image" : "summary",
        title: `${displayName} on Scrolls`,
        description,
        images: image ? [image] : undefined
      }
    };
  } catch {
    // Fall through to the generic app-open metadata when the post is private,
    // deleted, or temporarily unavailable.
  }
  return {
    title: "Scroll",
    description: `Open this Scrolls post: ${postId}`,
    openGraph: {
      title: "Open this scroll",
      description: "View this post in Scrolls."
    }
  };
}

export default async function ScrollPage({ params }: Params) {
  const { postId } = await params;
  let post: ScrollsPost | null = null;
  try {
    post = await fetchPost(postId);
  } catch {
    post = null;
  }

  return (
    <div>
      <SiteHeader />
      <AppSmartBanner deepLink={`scrolls://scroll/${postId}`} label="Open this scroll in the app" />
      <section className="mx-auto grid min-h-[70svh] max-w-2xl gap-6 px-5 py-10">
        {post ? (
          <>
            <div className="text-center">
              <p className="text-sm uppercase tracking-[0.22em] text-scrolls-gold">Shared scroll</p>
              <h1 className="mt-3 text-4xl font-black">View this post on Scrolls</h1>
            </div>
            <PostCard post={post} />
            <div className="flex flex-wrap justify-center gap-3">
              <a href={`scrolls://scroll/${postId}`} className="rounded-full bg-scrolls-blue px-5 py-3 text-sm font-bold">
                Open in app
              </a>
              <AppCTA />
            </div>
          </>
        ) : (
          <div className="self-center rounded-[2rem] border border-white/10 bg-scrolls-panel p-8 text-center">
            <p className="text-sm uppercase tracking-[0.22em] text-scrolls-gold">Shared scroll</p>
            <h1 className="mt-3 text-4xl font-black">Open this post in Scrolls</h1>
            <p className="mt-4 text-sm text-white/55">
              This post is private, deleted, or temporarily unavailable on the web.
            </p>
            <p className="mt-3 break-all text-xs text-white/35">{postId}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a href={`scrolls://scroll/${postId}`} className="rounded-full bg-scrolls-blue px-5 py-3 text-sm font-bold">
                Open in app
              </a>
              <AppCTA />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
