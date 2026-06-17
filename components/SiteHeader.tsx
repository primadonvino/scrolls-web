"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/BrandMark";
import { AppCTA } from "@/components/AppCTA";
import { NotificationBell } from "@/components/NotificationBell";
import { readSession } from "@/lib/auth/session";

type NavLink = { href: string; label: string };

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
        { href: "/feed", label: "Feed" },
        { href: "/search", label: "Search" },
        { href: "/compose", label: "Create" },
        { href: "/circles", label: "Circles" },
        { href: accountHref, label: "Account" }
      ]
    : [
        { href: "/feed", label: "Feed" },
        { href: "/search", label: "Search" },
        { href: "/signup", label: "Sign up" },
        { href: "/login", label: "Log in" }
      ];

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-scrolls-black/80 backdrop-blur-2xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4">
        <Link href="/" aria-label="Scrolls home" className="origin-left" onClick={() => setMenuOpen(false)}>
          <BrandMark compact />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-4 text-sm font-semibold text-white/68 sm:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-white">
              {link.label}
            </Link>
          ))}
          {signedIn ? <NotificationBell /> : null}
          <AppCTA label="Get the app" />
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

      {/* Mobile menu */}
      {menuOpen ? (
        <nav className="border-t border-white/[0.06] px-5 py-3 sm:hidden">
          <div className="flex flex-col gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-xl px-3 py-3 text-base font-bold text-white/85 transition hover:bg-white/10"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 px-1">
              <AppCTA label="Get the app" />
            </div>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
