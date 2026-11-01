// ================================================================
// SmartPlant IoT — Progressive Web App Service Worker
// Provides offline capability & app installability
// ================================================================

const CACHE_NAME = 'smartplant-pwa-v3';
const STATIC_ASSETS = [
  './',
  './index.html',
  './pages/monitoring.html',
  './manifest.json',
  './favicon.ico',
  './css/style.css',
  './css/dashboard.css',
  './css/responsive.css',
  './js/app.js',
  './js/charts.js',
  './js/dashboard.js',
  './js/firebase-config.js',
  './js/firebase-service.js',
  './js/sensor-service.js',
  './js/plant-service.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('PWA Cache prefill warning (non-fatal):', err);
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
  // Never intercept Firebase Realtime Database WebSockets or Auth API requests
  const url = event.request.url;
  if (
    url.includes('firebase') || 
    url.includes('firebaseio.com') || 
    url.includes('gstatic.com') || 
    url.includes('googleapis.com') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch fresh copy in background for next time
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('./index.html');
        }
      });
    })
  );
});
