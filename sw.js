/* Recon service worker — offline app shell.
   Bump CACHE on each release so clients pick up the new build. */
const CACHE = 'recon-v1.1.0';
const ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Only handle same-origin requests; let WebSockets / other origins pass through.
  if (url.origin !== self.location.origin) return;

  // App document: network-first so online players get the latest build,
  // fall back to the cached shell when offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((resp) => { const cp = resp.clone(); caches.open(CACHE).then((c) => c.put('/', cp)); return resp; })
        .catch(() => caches.match('/'))
    );
    return;
  }

  // Static assets: cache-first.
  e.respondWith(
    caches.match(req).then((hit) =>
      hit || fetch(req).then((resp) => {
        const cp = resp.clone();
        caches.open(CACHE).then((c) => c.put(req, cp));
        return resp;
      }).catch(() => hit)
    )
  );
});
