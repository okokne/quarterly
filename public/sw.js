const CACHE_NAME = '12wy-planner-v2';
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json'
];

// Install event - cache assets & skip waiting immediately
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(urlsToCache))
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean old caches & claim clients
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - NETWORK FIRST, cache fallback (for offline)
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Got a fresh response — cache it for offline use
                if (response && response.status === 200 && response.type === 'basic') {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME)
                        .then((cache) => cache.put(event.request, responseToCache));
                }
                return response;
            })
            .catch(() => {
                // Network failed — serve from cache (offline fallback)
                return caches.match(event.request);
            })
    );
});
