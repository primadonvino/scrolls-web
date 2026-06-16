import Link from "next/link";
import { AppCTA } from "@/components/AppCTA";
import { SiteHeader } from "@/components/SiteHeader";

export default function HomePage() {
  return (
    <div>
      <SiteHeader />
      <section className="mx-auto grid min-h-[72svh] max-w-5xl content-center gap-8 px-5 py-10">
        <div className="max-w-3xl">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.22em] text-scrolls-gold">Scrolls on the web</p>
          <h1 className="text-5xl font-black leading-[0.95] tracking-normal sm:text-7xl">
            Profiles and scrolls that open anywhere.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/65">
            A web companion for Scrolls: public profiles, shared posts, media previews, and clean App Store fallbacks for people who do not have the app yet.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <AppCTA />
            <Link href="/feed" className="rounded-full border border-white/15 px-5 py-3 text-sm font-bold text-white hover:bg-white/10">
              Preview feed
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
