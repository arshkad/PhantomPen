// PhantomPen OS — Service Worker
// Caches all app files after first load for full offline support

const CACHE = 'phantompen-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/src/styles.css',
  '/src/crypto.js',
  '/src/storage.js',
  '/src/editor.js',
  '/src/files.js',
  '/src/history.js',
  '/src/share.js',
  '/src/ai.js',
  '/src/backend.js',
  '/src/app.js',
];

// Install — cache all assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — serve from cache, fall back to network
self.addEventListener('fetch', e => {
  // Skip non-GET and localhost API calls (backend/ollama)
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('localhost')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      return cached || fetch(e.request).then(response => {
        // Cache new responses
        const clone = response.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, clone));
        return response;
      });
    }).catch(() => caches.match('/index.html'))
  );
});