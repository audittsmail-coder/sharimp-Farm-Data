/* Service worker: app-shell caching + always-fresh-on-deploy updates.
   CACHE_NAME is stamped with the build version by CI on every deploy,
   so a new push always produces a new cache and forces clients to update. */
const BUILD_ID = '__BUILD_VERSION__';
const CACHE_NAME = `shrimp-farm-cache-${BUILD_ID}`;

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './favicon.ico',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(networkFirst(request));
    return;
  }
  event.respondWith(cacheFirst(request));
});

async function networkFirst(request) {
  try {
    const fresh = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, fresh.clone());
    return fresh;
  } catch (err) {
    const cached = await caches.match(request);
    return cached || caches.match('./index.html');
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    fetch(request).then((fresh) => {
      caches.open(CACHE_NAME).then((cache) => cache.put(request, fresh));
    }).catch(() => {});
    return cached;
  }
  const fresh = await fetch(request);
  const cache = await caches.open(CACHE_NAME);
  cache.put(request, fresh.clone());
  return fresh;
}
