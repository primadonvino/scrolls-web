import Link from "next/link";
import { AppCTA } from "@/components/AppCTA";
import { SiteHeader } from "@/components/SiteHeader";

export default function HomePage() {
  return (
    <div>
      <SiteHeader />
      <section className="mx-auto grid min-h-[78svh] max-w-6xl grid-cols-1 items-center gap-10 px-5 py-12 lg:grid-cols-[1.02fr_0.98fr]">
        <div className="max-w-3xl">
          <h1 className="max-w-[13ch] text-5xl font-black leading-[0.94] tracking-normal text-white sm:text-7xl">
            Scroll what matters
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/66">
            Scrolls is a social feed for creators and communities: city posts, music releases, circles, live moments, and shareable profiles that open cleanly on the web.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="rounded-full bg-white px-6 py-3 text-sm font-black text-black transition hover:bg-white/90"
            >
              Create account
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-white/25 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
            >
              Log in
            </Link>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-white/55">
            <AppCTA />
            <Link href="/feed" className="font-bold text-white/80 transition hover:text-white">
              Preview feed →
            </Link>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center gap-7 py-6">
          <div className="relative">
            <div className="absolute -inset-8 rounded-[3.5rem] bg-[#e6309b]/25 blur-3xl" aria-hidden />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icon.png"
              alt="Scrolls"
              width={320}
              height={320}
              className="relative w-60 rounded-[2.75rem] shadow-glow sm:w-80"
            />
          </div>
          <p className="text-center text-sm font-bold uppercase tracking-[0.26em] text-scrolls-gold">
            Create freely · Discover deeply · Stay connected
          </p>
        </div>
      </section>
    </div>
  );
}
