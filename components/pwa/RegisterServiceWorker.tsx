"use client";

import { useEffect } from "react";

// Registers the service worker that makes Scrolls Web installable and provides
// an offline fallback. Registration is best-effort and only runs in browsers
// that support it; failures are non-fatal.
export function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* ignore — the app works fine without it */
      });
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);
  return null;
}
