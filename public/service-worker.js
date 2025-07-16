const CACHE_NAME = "CircuitPython-Online-IDE-cache.20250715.001";

// List all URLs you want to cache
const urlsToCache = ["index.html", "service-worker.js", "blinka-192.png", "blinka-512.png", "blinka.svg"];

// Install event: Cache the static files
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(urlsToCache);
        })
    );
});

// Activate event: Clean up old caches if needed
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) =>
            Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            )
        )
    );
});

self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.match(event.request).then((cachedResponse) => {
                const fetchPromise = fetch(event.request)
                    .then((networkResponse) => {
                        // Update the cache with the fresh resource
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    })
                    .catch(() => {
                        // Network request failed; if there's a cache, serve it
                        return cachedResponse;
                    });

                // Return cached response immediately if present
                return cachedResponse || fetchPromise;
            });
        })
    );
});
