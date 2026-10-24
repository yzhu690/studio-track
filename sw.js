/* Studio Track — offline shell cache */
const CACHE = 'studio-track-v1';
const ASSETS = [
  './',
  './index.html',
  './assets/css/app.css',
  './assets/js/data.js',
  './assets/js/store.js',
  './assets/js/charts.js',
  './assets/js/ai.js',
  './assets/js/app.js',
  './manifest.webmanifest'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // never touch API calls

  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) {
        fetch(req).then((res) => res.ok && caches.open(CACHE).then((c) => c.put(req, res))).catch(() => {});
        return hit;
      }
      return fetch(req).then((res) => {
        if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()));
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
