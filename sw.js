// Data City PWA Service Worker — offline app shell + 3D engine; live data & HTML try network first
const CACHE = 'datacity-v2';
const CORE = [
  './', './index.html', './city.html',
  './manifest.webmanifest', './icon-192.png', './icon-512.png',
  'https://unpkg.com/three@0.160.0/build/three.module.js'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled(CORE.map(u => c.add(u)))));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Live-data APIs: always network, fall back to cache on failure
  if (/open-meteo|overpass|earthquake\.usgs|coingecko|er-api|bigdatacloud|esm\.run|geocoding-api/.test(url.host + url.pathname)) {
    e.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }
  // HTML / navigation / SW / manifest: network-first so updates show; cache fallback when offline
  const isDoc = req.mode === 'navigate' || /\.html$|\/$|sw\.js$|\.webmanifest$/.test(url.pathname);
  if (url.origin === location.origin && isDoc) {
    e.respondWith(
      fetch(req).then(res => { if (res && res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return res; })
        .catch(() => caches.match(req).then(c => c || caches.match('./index.html')))
    );
    return;
  }
  // App-shell engine + icons: cache-first (immutable, big)
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      if (res && res.ok && (url.origin === location.origin || url.host.includes('unpkg'))) {
        const cp = res.clone();
        caches.open(CACHE).then(c => c.put(req, cp));
      }
      return res;
    }))
  );
});
