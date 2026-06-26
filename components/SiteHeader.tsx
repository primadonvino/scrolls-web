"use client";

import { Check, ChevronDown, Home, LogOut, Megaphone, Menu, Pen, Plus, Radio, Search, User, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Avatar } from "@/components/Avatar";
import { BrandMark } from "@/components/BrandMark";
import { AppCTA } from "@/components/AppCTA";
import { NotificationBell } from "@/components/NotificationBell";
import { clearSession, hydrateFounderManagedAccounts, listSavedAccounts, readSession, switchAccount, type StoredAccountSession } from "@/lib/auth/session";

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
  const router = useRouter();
  // Auth state lives in localStorage, so resolve it after mount to avoid a
  // server/client markup mismatch.
  const [signedIn, setSignedIn] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [activeUserID, setActiveUserID] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<StoredAccountSession[]>([]);
  const [isFounder, setIsFounder] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  useEffect(() => {
    function syncAuthState() {
      const session = readSession();
      setSignedIn(Boolean(session?.token && session.user?.id));
      setUsername(session?.user?.username ?? null);
      setActiveUserID(session?.user?.id ?? null);
      setAccounts(listSavedAccounts());
      setIsFounder(Boolean(session?.user?.isFounder ?? session?.user?.is_founder));
    }

    syncAuthState();
    const session = readSession();
    if (session?.token && (session.user?.isFounder ?? session.user?.is_founder)) {
      hydrateFounderManagedAccounts(session).catch(() => undefined);
    }
    window.addEventListener("scrolls-session-changed", syncAuthState);
    window.addEventListener("storage", syncAuthState);
    return () => {
      window.removeEventListener("scrolls-session-changed", syncAuthState);
      window.removeEventListener("storage", syncAuthState);
    };
  }, []);

  function selectAccount(userID: string) {
    const next = switchAccount(userID);
    if (!next) return;
    setMenuOpen(false);
    setAccountMenuOpen(false);
    window.location.href = "/feed";
  }

  function signOut() {
    clearSession();
    setMenuOpen(false);
    setAccountMenuOpen(false);
    router.push("/login");
  }

  const accountHref = username ? `/user/${encodeURIComponent(username)}` : "/account";
  const links: NavLink[] = signedIn
    ? [
        { href: "/search", label: "Search", icon: <Search size={20} /> },
        { href: "/feed", label: "Feed", icon: <Home size={20} /> },
        { href: "/live", label: "Live", icon: <Radio size={20} /> },
        { href: "/circles", label: "Circles", icon: <CirclesIcon size={20} /> },
        { href: "/compose", label: "Create", icon: <Pen size={20} /> },
        ...(isFounder ? [{ href: "/account/ads", label: "Ad terminal", icon: <Megaphone size={20} /> }] : []),
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
            <>
              <NotificationBell />
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAccountMenuOpen((open) => !open)}
                  className="ml-1 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] py-1.5 pl-1.5 pr-3 text-sm font-bold text-white/82 transition hover:bg-white/10"
                  aria-expanded={accountMenuOpen}
                  aria-label="Switch Scrolls account"
                >
                  <Avatar user={readSession()?.user} size={28} />
                  <span className="max-w-[120px] truncate">{username ? `@${username}` : "Account"}</span>
                  <ChevronDown size={16} />
                </button>
                {accountMenuOpen ? (
                  <AccountSwitcherMenu
                    accounts={accounts}
                    activeUserID={activeUserID}
                    onSelect={selectAccount}
                    onSignOut={signOut}
                  />
                ) : null}
              </div>
            </>
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
            {signedIn ? (
              <div className="mb-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-white/38">Switch account</p>
                <div className="space-y-1">
                  {accounts.map((account) => (
                    <button
                      key={account.user.id}
                      type="button"
                      onClick={() => selectAccount(account.user.id)}
                      className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-white/10"
                    >
                      <Avatar user={account.user} size={36} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-black text-white/90">
                          {account.user.displayName ?? account.user.display_name ?? account.user.username}
                        </span>
                        <span className="block truncate text-xs text-white/45">@{account.user.username}</span>
                      </span>
                      {account.user.id === activeUserID ? <Check size={18} className="text-scrolls-blue" /> : null}
                    </button>
                  ))}
                </div>
                <Link
                  href="/login?add=1"
                  onClick={() => setMenuOpen(false)}
                  className="mt-2 flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-bold text-white/75 transition hover:bg-white/10"
                >
                  <Plus size={17} /> Add another account
                </Link>
                <button
                  type="button"
                  onClick={signOut}
                  className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm font-bold text-red-100/80 transition hover:bg-red-400/10"
                >
                  <LogOut size={17} /> Log out
                </button>
              </div>
            ) : null}
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

function AccountSwitcherMenu({
  accounts,
  activeUserID,
  onSelect,
  onSignOut
}: {
  accounts: StoredAccountSession[];
  activeUserID: string | null;
  onSelect: (userID: string) => void;
  onSignOut: () => void;
}) {
  return (
    <div className="absolute right-0 top-full z-50 mt-3 w-80 overflow-hidden rounded-[1.4rem] border border-white/12 bg-[#111113]/95 p-2 shadow-2xl shadow-black/50 backdrop-blur-xl">
      <p className="px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/38">Scrolls accounts</p>
      <div className="max-h-80 overflow-y-auto">
        {accounts.map((account) => (
          <button
            key={account.user.id}
            type="button"
            onClick={() => onSelect(account.user.id)}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-white/10"
          >
            <Avatar user={account.user} size={42} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-black text-white">
                {account.user.displayName ?? account.user.display_name ?? account.user.username}
              </span>
              <span className="block truncate text-xs text-white/50">@{account.user.username}</span>
            </span>
            {account.user.id === activeUserID ? <Check size={18} className="text-scrolls-blue" /> : null}
          </button>
        ))}
      </div>
      <div className="mt-2 border-t border-white/10 pt-2">
        <Link
          href="/login?add=1"
          className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold text-white/80 transition hover:bg-white/10"
        >
          <Plus size={18} /> Add another account
        </Link>
        <button
          type="button"
          onClick={onSignOut}
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold text-red-100/80 transition hover:bg-red-400/10"
        >
          <LogOut size={18} /> Log out
        </button>
      </div>
    </div>
  );
}
