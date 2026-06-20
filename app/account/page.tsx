"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AlertTriangle, LogOut, Megaphone, Trash2 } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { SiteHeader } from "@/components/SiteHeader";
import { ThemeSelector } from "@/components/theme/ThemeSelector";
import { clearSession, readFreshSession, readSession } from "@/lib/auth/session";
import { deleteCurrentAccount } from "@/lib/api/scrolls";
import type { AuthSession } from "@/lib/types/scrolls";

export default function AccountPage() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(() => readSession());
  const [busy, setBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    readFreshSession().then((fresh) => {
      if (!cancelled) setSession(fresh);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function signOut() {
    clearSession();
    setSession(null);
    router.push("/login");
  }

  async function deleteAccount() {
    const fresh = await readFreshSession();
    setSession(fresh);
    if (!fresh?.token) {
      router.push("/login");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await deleteCurrentAccount(fresh.token);
      clearSession();
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete your account.");
    } finally {
      setBusy(false);
      setConfirmingDelete(false);
    }
  }

  const user = session?.user;
  const displayName = user?.displayName ?? user?.display_name ?? user?.username ?? "Scrolls";
  const isFounder = Boolean(user?.isFounder ?? user?.is_founder);

  return (
    <div>
      <SiteHeader />
      <section className="mx-auto max-w-2xl px-5 pb-16">
        <div className="mb-6">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-scrolls-gold">Account</p>
          <h1 className="mt-2 text-4xl font-black">Settings</h1>
        </div>

        <div className="scrolls-glass mb-5 rounded-[1.8rem] p-5">
          <h2 className="text-lg font-black">Appearance</h2>
          <p className="mt-1 text-sm text-white/55">Choose how Scrolls looks on this device.</p>
          <div className="mt-4">
            <ThemeSelector />
          </div>
        </div>

        {!user ? (
          <div className="scrolls-glass rounded-[1.8rem] p-6">
            <p className="text-white/62">Log in to manage your Scrolls account.</p>
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="mt-5 rounded-full bg-white px-5 py-3 text-sm font-black text-black"
            >
              Log in
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="scrolls-glass rounded-[1.8rem] p-5">
              <div className="flex items-center gap-4">
                <Avatar user={user} size={64} />
                <div className="min-w-0">
                  <p className="truncate text-2xl font-black">{displayName}</p>
                  <p className="truncate text-white/55">@{user.username}</p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <a
                  href="/account/edit"
                  className="rounded-full bg-white px-5 py-3 text-sm font-black text-black"
                >
                  Edit profile
                </a>
                <a
                  href="/account/social"
                  className="rounded-full border border-white/15 px-5 py-3 text-sm font-bold text-white/85 transition hover:bg-white/10"
                >
                  Followers &amp; requests
                </a>
                {isFounder ? (
                  <a
                    href="/account/ads"
                    className="inline-flex items-center gap-2 rounded-full border border-scrolls-gold/35 px-5 py-3 text-sm font-bold text-scrolls-gold transition hover:bg-scrolls-gold/10"
                  >
                    <Megaphone size={18} /> Ad terminal
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={signOut}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-3 text-sm font-bold text-white/85 transition hover:bg-white/10"
                >
                  <LogOut size={18} /> Log out
                </button>
                <a
                  href={`scrolls://user/${user.username}`}
                  className="rounded-full bg-scrolls-blue px-5 py-3 text-sm font-bold text-white"
                >
                  Open profile in app
                </a>
              </div>
            </div>

            <div className="rounded-[1.8rem] border border-red-400/20 bg-red-500/10 p-5">
              <div className="flex gap-3">
                <AlertTriangle className="mt-1 shrink-0 text-red-200" size={22} />
                <div>
                  <h2 className="text-xl font-black text-red-100">Delete account</h2>
                  <p className="mt-2 text-sm leading-6 text-red-100/72">
                    This permanently deletes your Scrolls account, posts, comments, and uploaded media.
                    This cannot be undone.
                  </p>
                </div>
              </div>
              {confirmingDelete ? (
                <div className="mt-5 rounded-3xl border border-red-300/20 bg-black/35 p-4">
                  <p className="text-sm font-bold text-red-100">Are you absolutely sure?</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={deleteAccount}
                      className="inline-flex items-center gap-2 rounded-full bg-red-400 px-5 py-3 text-sm font-black text-black disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <Trash2 size={18} /> {busy ? "Deleting..." : "Delete permanently"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setConfirmingDelete(false)}
                      className="rounded-full border border-white/15 px-5 py-3 text-sm font-bold text-white/80"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  className="mt-5 inline-flex items-center gap-2 rounded-full border border-red-300/30 px-5 py-3 text-sm font-black text-red-100"
                >
                  <Trash2 size={18} /> Delete account
                </button>
              )}
              {error ? <p className="mt-4 text-sm text-red-100">{error}</p> : null}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
