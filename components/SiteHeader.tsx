"use client";

import { Home, Menu, Pen, Radio, Search, User, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { BrandMark } from "@/components/BrandMark";
import { AppCTA } from "@/components/AppCTA";
import { NotificationBell } from "@/components/NotificationBell";
import { readSession } from "@/lib/auth/session";

type NavLink = { href: string; label: string; icon: ReactNode };

/** Two interlocking circles — the Circles brand mark. */
function CirclesIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <circle cx="9" cy="12" r="6" />
      <circle cx="15" cy="12" r="6" />
    </svg>
  );
}

export function SiteHeader() {
  // Auth state lives in localStorage, so resolve it after mount to avoid a
  // server/client markup mismatch.
  const [signedIn, setSignedIn] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const session = readSession();
    setSignedIn(Boolean(session?.token && session.user?.id));
    setUsername(session?.user?.username ?? null);
  }, []);

  const accountHref = username ? `/user/${encodeURIComponent(username)}` : "/account";
  const links: NavLink[] = signedIn
    ? [
        { href: "/search", label: "Search", icon: <Search size={20} /> },
        { href: "/feed", label: "Feed", icon: <Home size={20} /> },
        { href: "/live", label: "Live", icon: <Radio size={20} /> },
        { href: "/circles", label: "Circles", icon: <CirclesIcon size={20} /> },
        { href: "/compose", label: "Create", icon: <Pen size={20} /> },
        { href: accountHref, label: "Profile", icon: <User size={20} /> }
      ]
    : [
        { href: "/search", label: "Search", icon: <Search size={20} /> },
        { href: "/feed", label: "Feed", icon: <Home size={20} /> },
        { href: "/live", label: "Live", icon: <Radio size={20} /> }
      ];

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-scrolls-black/80 backdrop-blur-2xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4">
        <Link href="/" aria-label="Scrolls home" className="origin-left" onClick={() => setMenuOpen(false)}>
          <BrandMark compact />
        </Link>

        {/* Desktop nav — icon buttons */}
        <nav className="hidden items-center gap-1 text-white/68 sm:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              title={link.label}
              aria-label={link.label}
              className="grid h-10 w-10 place-items-center rounded-full transition hover:bg-white/10 hover:text-white"
            >
              {link.icon}
            </Link>
          ))}
          {signedIn ? (
            <NotificationBell />
          ) : (
            <>
              <Link href="/signup" className="ml-1 text-sm font-semibold text-white/80 transition hover:text-white">Sign up</Link>
              <Link href="/login" className="text-sm font-semibold text-white/80 transition hover:text-white">Log in</Link>
            </>
          )}
          <div className="ml-1">
            <AppCTA label="Get the app" />
          </div>
        </nav>

        {/* Mobile controls */}
        <div className="flex items-center gap-2 sm:hidden">
          {signedIn ? <NotificationBell /> : null}
          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="grid h-10 w-10 place-items-center rounded-full border border-white/15 text-white/85 transition hover:bg-white/10"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu — icon + label rows */}
      {menuOpen ? (
        <nav className="border-t border-white/[0.06] px-5 py-3 sm:hidden">
          <div className="flex flex-col gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-base font-bold text-white/85 transition hover:bg-white/10"
              >
                <span className="text-white/70">{link.icon}</span>
                {link.label}
              </Link>
            ))}
            {!signedIn ? (
              <>
                <Link href="/signup" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-base font-bold text-white/85 transition hover:bg-white/10">
                  Sign up
                </Link>
                <Link href="/login" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-base font-bold text-white/85 transition hover:bg-white/10">
                  Log in
                </Link>
              </>
            ) : null}
            <div className="mt-2 px-1">
              <AppCTA label="Get the app" />
            </div>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
