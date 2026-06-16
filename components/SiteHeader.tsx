import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { AppCTA } from "@/components/AppCTA";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-scrolls-black/80 backdrop-blur-2xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4">
        <Link href="/" aria-label="Scrolls home" className="origin-left">
          <BrandMark compact />
        </Link>
        <nav className="flex items-center gap-4 text-sm font-semibold text-white/68">
          <Link href="/feed" className="hidden transition hover:text-white sm:inline">Feed</Link>
          <Link href="/login" className="hidden transition hover:text-white sm:inline">Log in</Link>
          <AppCTA label="Get the app" />
        </nav>
      </div>
    </header>
  );
}
