// SmartPlant Cloud — Progressive Web App Service Worker
const CACHE_NAME = 'smartplant-cloud-v1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './dashboard.html',
  './analytics.html',
  './irrigation.html',
  './devices.html',
  './reports.html',
  './settings.html',
  './manifest.json',
  './css/style.css',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Cache prefill warning (non-fatal):', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Do not intercept Firebase Realtime Database WebSockets / REST requests
  if (event.request.url.includes('firebase') || event.request.url.includes('gstatic.com') || event.request.url.includes('googleapis.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('./dashboard.html');
        }
      });
    })
  );
});
