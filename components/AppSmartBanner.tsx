"use client";

import { useEffect, useState } from "react";

const appStoreURL =
  process.env.NEXT_PUBLIC_SCROLLS_APP_STORE_URL ?? "https://apps.apple.com/us/app/scrolls/id6761082441";

/**
 * Sticky "continue in app" banner for public pages. Mobile-only and
 * dismissible (remembered for the session). Tries the scrolls:// deep link
 * first and falls back to the App Store.
 */
export function AppSmartBanner({ deepLink, label = "Open in the Scrolls app" }: { deepLink: string; label?: string }) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const hidden = sessionStorage.getItem("scrolls.smartbanner.dismissed") === "1";
    setDismissed(hidden);
  }, []);

  if (dismissed) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-scrolls-black/95 backdrop-blur-xl sm:hidden">
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black text-white">{label}</p>
          <p className="truncate text-xs text-white/50">Faster, with everything Scrolls can do.</p>
        </div>
        <a
          href={deepLink}
          className="shrink-0 rounded-full bg-scrolls-blue px-4 py-2 text-sm font-black text-white"
        >
          Open
        </a>
        <a
          href={appStoreURL}
          className="shrink-0 rounded-full border border-white/15 px-3 py-2 text-xs font-bold text-white/80"
        >
          Get app
        </a>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => {
            sessionStorage.setItem("scrolls.smartbanner.dismissed", "1");
            setDismissed(true);
          }}
          className="shrink-0 px-1 text-lg leading-none text-white/45"
        >
          ×
        </button>
      </div>
    </div>
  );
}
