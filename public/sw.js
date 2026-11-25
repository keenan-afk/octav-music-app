// Octav Safe Network-First Service Worker
// Ensures Vercel deployments update immediately without trapping phones on stale JS bundles,
// while enabling standalone PWA installability on iOS & Android.

const STATIC_CACHE = 'octav-shell-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(['/manifest.json']).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== STATIC_CACHE && k !== 'octav-offline-audio-v1')
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Never intercept cross-origin audio/API requests or range streams
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return;
  }

  // Network-first for HTML & app bundles so new deployments appear immediately
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.ok && (url.pathname === '/' || url.pathname === '/manifest.json')) {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone)).catch(() => {});
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
