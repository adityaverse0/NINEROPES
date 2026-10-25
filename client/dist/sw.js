/**
 * NINEROPES Cinema Service Worker
 * High-performance PWA caching engine:
 * - Offline-first App Shell navigation
 * - Cache-first for content-hashed Vite assets
 * - Stale-while-revalidate for catalog API feeds (instant 0ms loading + offline browsing)
 * - Safe bypass for range-based streaming & download mirrors
 */

const CACHE_NAME = 'nineropes-pwa-v1.0';
const API_CACHE_NAME = 'nineropes-api-v1.0';
const IMAGE_CACHE_NAME = 'nineropes-images-v1.0';
const MAX_IMAGE_CACHE_ENTRIES = 120;

// Core assets to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon.svg',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png'
];

// Install: pre-cache the application shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn('[PWA SW] Precache error:', err))
  );
});

// Activate: clean up outdated cache buckets and claim clients
self.addEventListener('activate', (event) => {
  const allowedCaches = [CACHE_NAME, API_CACHE_NAME, IMAGE_CACHE_NAME];
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (!allowedCaches.includes(key)) {
            console.log('[PWA SW] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Helper: Trim cache to avoid exceeding storage quota
async function trimCache(cacheName, maxItems) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
      await cache.delete(keys[0]);
      trimCache(cacheName, maxItems);
    }
  } catch (err) {
    // Ignore cache trim errors
  }
}

// Fetch handler
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Bypass streaming video or download mirrors with Range headers
  if (request.headers.has('range') || url.pathname.includes('/download') || url.pathname.includes('/stream')) {
    return;
  }

  // 1. Navigation Requests (HTML Pages / SPA routes)
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Network-first with fast fallback
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put('/index.html', networkResponse.clone());
            return networkResponse;
          }
        } catch (err) {
          // Network failed or device offline
        }
        // Fallback to cached index.html
        const cachedShell = await caches.match('/index.html') || await caches.match('/');
        if (cachedShell) return cachedShell;

        return new Response(
          '<!DOCTYPE html><html><body style="font-family:sans-serif;background:#262624;color:#faf9f5;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="text-align:center;"><h2>NINEROPES</h2><p>You are currently offline. Please reconnect to load new titles.</p></div></body></html>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      })()
    );
    return;
  }

  // 2. Vite Hashed Static Assets (/assets/*) -> Cache First
  if (url.origin === self.location.origin && url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const resClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, resClone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 3. External API Catalog Feeds (api.hicine.biz/rpc/*) -> Stale While Revalidate
  if (url.hostname.includes('api.hicine.biz')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(API_CACHE_NAME);
        const cachedResponse = await cache.match(request);

        // Fetch fresh data in the background
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.ok) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => null);

        // Return cached data immediately if available, otherwise wait for network
        return cachedResponse || (await fetchPromise) || new Response(JSON.stringify({ error: 'Offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })()
    );
    return;
  }

  // 4. Poster / Thumbnail Images -> Stale While Revalidate with LRU limits
  if (
    url.hostname.includes('storage.hicine.biz') ||
    url.hostname.includes('images.unsplash.com') ||
    request.destination === 'image'
  ) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(IMAGE_CACHE_NAME);
        const cachedResponse = await cache.match(request);
        if (cachedResponse) return cachedResponse;

        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.ok) {
            cache.put(request, networkResponse.clone());
            trimCache(IMAGE_CACHE_NAME, MAX_IMAGE_CACHE_ENTRIES);
          }
          return networkResponse;
        } catch (err) {
          // If offline and not in cache, fallback gracefully
          return cachedResponse || new Response('', { status: 408 });
        }
      })()
    );
    return;
  }

  // 5. Default Strategy: Cache First with Network Fallback
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((res) => {
        if (res && res.ok && url.origin === self.location.origin) {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, resClone));
        }
        return res;
      });
    })
  );
});

// Allow app to trigger immediate activation of waiting worker
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
