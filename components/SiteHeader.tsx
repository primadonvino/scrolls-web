import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { AppCTA } from "@/components/AppCTA";

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-5">
      <Link href="/" aria-label="Scrolls home">
        <BrandMark />
      </Link>
      <nav className="flex items-center gap-3 text-sm text-white/70">
        <Link href="/feed" className="hidden hover:text-white sm:inline">Feed</Link>
        <Link href="/login" className="hidden hover:text-white sm:inline">Log in</Link>
        <AppCTA label="Get the app" />
      </nav>
    </header>
  );
}
