// 数据城市 PWA Service Worker —— 离线缓存应用外壳 + 3D 引擎；实时数据始终走网络
const CACHE = 'datacity-v1';
const CORE = [
  './', './index.html', './city.html', './explore.html',
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
  // 实时数据接口：始终走网络以保证新鲜，失败再回退缓存
  if (/open-meteo|overpass|earthquake\.usgs|coingecko|er-api|bigdatacloud|esm\.run|geocoding-api/.test(url.host + url.pathname)) {
    e.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }
  // 应用外壳 + 引擎：缓存优先，命中即返回；否则联网取并写入缓存
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
