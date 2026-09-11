/* eslint-disable */
// PWA offline shell (N6 in the remaining-work checklist). Deliberately
// minimal: caches a handful of always-static assets at install time, then
// serves them from cache on fetch, falling back to the network for
// everything else. This is NOT an attempt to make the authenticated
// portal (patient/doctor/admin dashboards) work offline -- that data is
// real-time and clinical, and serving it stale from a cache would be
// actively wrong for a healthcare app. This only keeps the app's static
// shell (icons, manifest, offline fallback) available when the network
// genuinely isn't, matching the checklist's own "offline shell for static
// routes" scope, not a general offline-first rewrite.
const CACHE_NAME = 'orivex-shell-v1';
const SHELL_ASSETS = ['/manifest.webmanifest', '/orivex-icon.png', '/offline.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // Navigations (real page loads) fall back to the cached offline shell
  // page only when the network request genuinely fails -- every online
  // navigation always hits the real network first, never the cache, so a
  // signed-in user never sees stale authenticated content.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/offline.html')));
    return;
  }

  // Static shell assets: cache-first, since these never carry patient data
  // and rarely change.
  if (SHELL_ASSETS.some((asset) => request.url.endsWith(asset))) {
    event.respondWith(caches.match(request).then((cached) => cached ?? fetch(request)));
  }
});
