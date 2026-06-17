// Minimal, conservative service worker for Scrolls Web.
//
// Goal: satisfy PWA installability + provide an offline fallback, WITHOUT
// caching app HTML/JS (Next assets are content-hashed and the feed is live, so
// caching them risks serving stale content). We only precache a static offline
// page and serve it when a navigation fails while offline. Everything else
// passes straight through to the network.

const CACHE = "scrolls-shell-v3";
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll([OFFLINE_URL, "/icon.png"]))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  // Only intercept top-level navigations; serve the offline page if the
  // network is unreachable. Never cache the live response.
  if (request.mode !== "navigate") return;
  event.respondWith(
    fetch(request).catch(() => caches.match(OFFLINE_URL))
  );
});
