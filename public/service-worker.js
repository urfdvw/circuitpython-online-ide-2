// The service-worker is configured to allow the IDE to be installed
// as a local app for offline use. In the Chrome URL bar you
// will see an install button when you visit the IDE website.
//
// Once the app is installed, it will try to update itself when
// the Internet is available.
//
// The intention is to cache all files needed to run the IDE.
// If new files are added to the deployment, update the
// CACHE_NAME variable to a new version and update the
// values in urlsToCache to include the new files.

// Name of the cache. Update when the list of files to cache changes.
const CACHE_NAME = "CircuitPython-Online-IDE-cache.20250716.001";

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

// Intercept fetch requests, then try to get a fresh copy of the file
// if the Internet is available, otherwise serve the cached version.
self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.match(event.request).then((cachedResponse) => {
                const fetchPromise = fetch(event.request)
                    .then((networkResponse) => {
                            // Only cache GET requests and successful responses.
                            // The Cache API only supports caching GET requests; attempting to
                            // cache other methods (e.g. HEAD) will throw a TypeError.
                            try {
                                if (event.request.method === 'GET' && networkResponse && networkResponse.ok) {
                                    cache.put(event.request, networkResponse.clone());
                                }
                            } catch (cacheErr) {
                                // Log and continue; do not let caching errors break responses.
                                console.warn('Service worker cache.put failed:', cacheErr);
                            }
                            return networkResponse;
                        })
                    .catch(() => {
                        // Network request failed; if there's a cache, serve it
                        console.log("Serving cached response for " + event.request.url);
                        return cachedResponse;
                    });

                // Return cached response immediately if present
                return cachedResponse || fetchPromise;
            });
        })
    );
});
