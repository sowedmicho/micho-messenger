const CACHE_NAME = 'micho-messenger-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/css/style.css',
    '/css/call.css',
    '/js/firebase-config.js',
    '/js/app.js',
    '/assets/images/default-avatar.png',
    '/assets/images/favicon.png',
    '/manifest.json'
];

// Install
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Fetch
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    
    event.respondWith(
        caches.match(event.request).then((cached) => {
            const networked = fetch(event.request)
                .then((response) => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, clone);
                    });
                    return response;
                })
                .catch(() => cached);
            
            return cached || networked;
        })
    );
});