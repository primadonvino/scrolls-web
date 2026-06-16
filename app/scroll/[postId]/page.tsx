import type { Metadata } from "next";
import { AppCTA } from "@/components/AppCTA";
import { SiteHeader } from "@/components/SiteHeader";

type Params = { params: Promise<{ postId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { postId } = await params;
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
  return (
    <div>
      <SiteHeader />
      <section className="mx-auto grid min-h-[70svh] max-w-2xl place-items-center px-5 text-center">
        <div className="rounded-[2rem] border border-white/10 bg-scrolls-panel p-8">
          <p className="text-sm uppercase tracking-[0.22em] text-scrolls-gold">Shared scroll</p>
          <h1 className="mt-3 text-4xl font-black">Open this post in Scrolls</h1>
          <p className="mt-4 break-all text-sm text-white/55">{postId}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href={`scrolls://scroll/${postId}`} className="rounded-full bg-scrolls-blue px-5 py-3 text-sm font-bold">
              Open in app
            </a>
            <AppCTA />
          </div>
          <p className="mt-5 text-sm text-white/45">
            Post-detail rendering is scaffolded. The next pass should add a dedicated backend endpoint or REST lookup for public post previews.
          </p>
        </div>
      </section>
    </div>
  );
}
