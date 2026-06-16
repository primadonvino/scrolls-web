import Link from "next/link";
import { AppCTA } from "@/components/AppCTA";
import { BrandMark } from "@/components/BrandMark";
import { SiteHeader } from "@/components/SiteHeader";

export default function HomePage() {
  return (
    <div>
      <SiteHeader />
      <section className="mx-auto grid min-h-[78svh] max-w-6xl grid-cols-1 items-center gap-10 px-5 py-12 lg:grid-cols-[1.02fr_0.98fr]">
        <div className="max-w-3xl">
          <p className="mb-5 text-sm font-bold uppercase tracking-[0.22em] text-scrolls-gold">Now on the App Store</p>
          <h1 className="flex flex-col gap-3">
            <BrandMark />
            <span className="max-w-[13ch] text-5xl font-black leading-[0.94] tracking-normal text-white sm:text-7xl">
              profiles, posts, music, moments.
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/66">
            Scrolls is a social feed for creators and communities: city posts, music releases, circles, live moments, and shareable profiles that open cleanly on the web.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <AppCTA />
            <Link href="/feed" className="rounded-full border border-white/15 px-5 py-3 text-sm font-bold text-white/90 transition hover:bg-white/10">
              Preview feed
            </Link>
          </div>
        </div>
        <div className="scrolls-glass overflow-hidden rounded-[2rem] p-4">
          <div className="rounded-[1.6rem] border border-white/[0.08] bg-black p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">Main Feed</p>
                <p className="mt-1 text-2xl font-black text-white">Open scrolls anywhere</p>
              </div>
              <span className="rounded-full border border-scrolls-gold/50 px-3 py-1 text-xs font-bold text-scrolls-gold">Founder</span>
            </div>
            <div className="rounded-[1.35rem] border border-white/[0.08] bg-scrolls-panel p-4">
              <div className="mb-4 flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-scrolls-gold text-sm font-black text-black">TT</div>
                <div className="min-w-0">
                  <p className="truncate text-lg font-black">Toni Todaro</p>
                  <p className="truncate text-sm text-white/50">@primadonvino · Wichita</p>
                </div>
              </div>
              <div className="aspect-[4/5] rounded-[1.2rem] bg-gradient-to-b from-white/[0.08] to-white/[0.02]">
                <div className="flex h-full items-end p-5">
                  <div>
                    <p className="scrolls-wordmark text-5xl text-white">Scrolls</p>
                    <p className="mt-2 max-w-xs text-sm leading-6 text-white/62">A live web preview that sends people back into the app when they are ready to post, reply, or join the conversation.</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-white/[0.08] pt-3 text-sm">
                <span className="text-white/45">scrolls.adastra.love</span>
                <Link href="/user/primadonvino" className="font-bold text-white">View profile</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
