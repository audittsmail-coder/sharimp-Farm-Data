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

// Firebase SDK files are static and safe to cache-first across origins so
// the app shell (incl. the login screen) can still boot offline. Firestore
// and Auth API calls themselves are left untouched — the SDK's own offline
// queue and network logic handle those.
const PRECACHE_CROSS_ORIGIN_URLS = [
  'https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js',
];
const CACHEABLE_CROSS_ORIGIN = (url) =>
  url.origin === 'https://www.gstatic.com' && url.pathname.startsWith('/firebasejs/');

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(PRECACHE_URLS);
    // Best-effort: don't fail install if the CDN is unreachable at build time.
    await Promise.allSettled(PRECACHE_CROSS_ORIGIN_URLS.map((url) => cache.add(url)));
  })());
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
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && !CACHEABLE_CROSS_ORIGIN(url)) return;

  if (sameOrigin && (request.mode === 'navigate' || request.destination === 'document')) {
    event.respondWith(networkFirst(request));
    return;
  }
  event.respondWith(cacheFirst(request));
});

async function networkFirst(request) {
  try {
    // Bypass the browser's HTTP cache entirely — without this, a network
    // "fetch" can still silently resolve to a stale disk-cached response
    // (per the page's Cache-Control headers), defeating the whole point
    // of network-first and making deploys look like they never landed.
    const fresh = await fetch(request, { cache: 'no-store' });
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
