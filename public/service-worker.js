// Cache only this installation's files. Bump the version when the offline shell changes.
const CACHE_PREFIX = `CircuitPython-Online-IDE:${self.registration.scope}:`;
const CACHE_NAME = `${CACHE_PREFIX}v2`;
const urlsToCache = ["index.html", "tree-sitter-python.wasm", "blinka-192.png", "blinka-512.png", "blinka.svg"];

self.addEventListener("install", (event) => {
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)));
});

self.addEventListener("activate", (event) => {
    event.waitUntil(caches.keys().then((names) => Promise.all(
        names.filter((name) => name !== CACHE_NAME &&
            (name.startsWith(CACHE_PREFIX) || name.startsWith("CircuitPython-Online-IDE-cache.")))
            .map((name) => caches.delete(name))
    )));
});

async function fetchOrCached(request) {
    let response;
    try {
        response = await fetch(request);
    } catch {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(request);
        if (cached) return cached;
        if (request.mode === "navigate") {
            const shell = await cache.match(new URL("index.html", self.registration.scope).href);
            if (shell) return shell;
        }
        return Response.error();
    }
    if (response.ok) {
        try {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, response.clone());
        } catch (error) {
            // Cache writes reject asynchronously (for example, when storage is full).
            console.warn("Could not cache IDE resource:", error);
        }
    }
    return response;
}

self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET" || !event.request.url.startsWith(self.registration.scope)) return;
    // Prefer fresh code online, with the installed shell available when offline.
    event.respondWith(fetchOrCached(event.request));
});
