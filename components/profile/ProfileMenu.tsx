"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { clearSession } from "@/lib/auth/session";

const BASE = process.env.NEXT_PUBLIC_SCROLLS_WEB_BASE_URL ?? "https://scrolls.adastra.love";

const itemClass = "block w-full rounded-xl px-4 py-2.5 text-left text-sm font-bold text-white/85 transition hover:bg-white/10";

/**
 * The "•••" menu on a user's own profile — the web-functional subset of the
 * iOS profile menu (Edit profile, Share QR, Directory, settings, legals, log
 * out, delete). App-only items (Verify, Ads, Drafts, Signature) live in the app.
 */
export function ProfileMenu({ username }: { username: string }) {
  const router = useRouter();
  const [qrOpen, setQrOpen] = useState(false);
  const profileURL = `${BASE}/user/${encodeURIComponent(username)}`;

  function logOut() {
    clearSession();
    router.push("/login");
  }

  return (
    <>
      <details className="group relative">
        <summary className="flex cursor-pointer list-none items-center rounded-full border border-white/20 px-4 py-3 text-sm font-bold text-white/85 transition hover:bg-white/10">
          •••
        </summary>
        <div className="absolute left-0 z-30 mt-2 w-60 overflow-hidden rounded-2xl border border-white/10 bg-scrolls-panel p-1 shadow-glow">
          <Link href="/account/edit" className={itemClass}>Edit profile</Link>
          <Link href="/account" className={itemClass}>Account settings</Link>
          <button type="button" onClick={() => setQrOpen(true)} className={itemClass}>Share profile QR</button>
          <Link href="/account/social" className={itemClass}>Directory</Link>
          <Link href="/terms" className={itemClass}>Terms</Link>
          <Link href="/privacy" className={itemClass}>Privacy Policy</Link>
          <a href={`scrolls://user/${username}`} className={itemClass}>Open in Scrolls</a>
          <div className="my-1 border-t border-white/10" />
          <button type="button" onClick={logOut} className={itemClass}>Log out</button>
          <Link href="/account" className={`${itemClass} text-red-300/90 hover:text-red-200`}>Delete account</Link>
        </div>
      </details>

      {qrOpen ? <QrModal url={profileURL} username={username} onClose={() => setQrOpen(false)} /> : null}
    </>
  );
}

function QrModal({ url, username, onClose }: { url: string; username: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=12&data=${encodeURIComponent(url)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable; ignore.
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-5 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-[2rem] border border-white/10 bg-scrolls-panel p-6 text-center"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-scrolls-gold">Share profile</p>
        <h2 className="mt-2 text-2xl font-black">@{username}</h2>
        <div className="mx-auto mt-5 w-fit rounded-2xl bg-white p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrSrc} alt={`QR code for @${username}`} width={240} height={240} className="h-60 w-60" />
        </div>
        <p className="mt-4 break-all text-xs text-white/50">{url}</p>
        <div className="mt-5 flex justify-center gap-3">
          <button type="button" onClick={copy} className="rounded-full bg-white px-5 py-2.5 text-sm font-black text-black">
            {copied ? "Copied!" : "Copy link"}
          </button>
          <button type="button" onClick={onClose} className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-bold text-white/85">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
