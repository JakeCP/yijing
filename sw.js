// Yijing — offline service worker. Precaches the whole app shell so an
// installed copy opens with no network; see README.md ("Install as an
// app") before changing anything here.
//
// Freshness contract ("never serve stale code forever"):
// - index.html and data/*.json are network-first: online readers always
//   get the current page and texts; the cache is only a fallback.
// - Fonts and icons are cache-first (they change rarely and are the
//   heavy downloads).
// - CSS/JS and the rest are stale-while-revalidate: instant from cache,
//   refreshed in the background for the next visit. Combined with the
//   versioned cache below, code is never more than one visit stale.
//
// VERSIONING: bump APP_VERSION whenever any precached file changes
// (HTML/CSS/JS, fonts, icons, manifest, data). The browser byte-diffs
// sw.js on navigation, installs the new worker, precaches into the new
// cache name and — on activate — deletes every older cache. Bumping
// DATA_VERSION in js/app.js for a data change? Bump this too if you want
// already-installed copies to refresh their offline texts immediately
// (network-first covers online freshness either way).
const APP_VERSION = '1';
const CACHE_NAME = `yijing-v${APP_VERSION}`;

// Relative to the worker's scope ("./" = repo root = /yijing/ on Pages).
// tests/pwa.test.js asserts every entry exists in the repo: a 404 in
// cache.addAll fails the whole install, so a typo here means no offline.
const PRECACHE_URLS = [
  './',
  'index.html',
  'css/style.css',
  'js/app.js',
  'js/engine.js',
  'js/render.js',
  'js/book.js',
  'js/about.js',
  'fonts/eb-garamond.woff2',
  'fonts/eb-garamond-italic.woff2',
  'fonts/noto-serif-tc.woff2',
  'data/hexagrams.json',
  'data/trigrams.json',
  'manifest.webmanifest',
  'favicon.svg',
  'icons/apple-touch-icon.png',
  'icons/favicon-32.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-192.png',
  'icons/icon-maskable-512.png',
  'icons/icon-monochrome-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)),
      ))
      .then(() => self.clients.claim()),
  );
});

async function putIfOk(cache, request, response) {
  if (response && response.ok) await cache.put(request, response.clone());
  return response;
}

// Navigations and data JSON. Fallback matching ignores the search string
// so a precached "data/hexagrams.json" answers the app's versioned fetch
// ("data/hexagrams.json?v=6") when offline.
async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(CACHE_NAME);
  try {
    return await putIfOk(cache, request, await fetch(request));
  } catch {
    return (await cache.match(request, { ignoreSearch: true }))
      || (fallbackUrl ? cache.match(fallbackUrl) : Response.error());
  }
}

// Fonts, icons, favicon: serve the cached copy, fill the cache on a miss.
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const hit = await cache.match(request, { ignoreSearch: true });
  if (hit) return hit;
  return putIfOk(cache, request, await fetch(request));
}

// Everything else in scope (CSS, JS, manifest): cached copy now,
// network copy saved for the next visit.
async function staleWhileRevalidate(request, event) {
  const cache = await caches.open(CACHE_NAME);
  const hit = await cache.match(request, { ignoreSearch: true });
  const network = fetch(request)
    .then((response) => putIfOk(cache, request, response))
    .catch(() => null);
  event.waitUntil(network); // keep the worker alive until the copy is saved
  return hit || (await network) || Response.error();
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // no third-party requests by design

  // Hash routes (#/r/..., #/h/...): the fragment never reaches the
  // worker, so a navigation is always just the shell — serve the
  // cached index.html offline and let the router take it from there.
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, 'index.html'));
  } else if (url.pathname.endsWith('/data/hexagrams.json') || url.pathname.endsWith('/data/trigrams.json')) {
    event.respondWith(networkFirst(request));
  } else if (url.pathname.includes('/fonts/') || url.pathname.includes('/icons/') || url.pathname.endsWith('/favicon.svg')) {
    event.respondWith(cacheFirst(request));
  } else {
    event.respondWith(staleWhileRevalidate(request, event));
  }
});
