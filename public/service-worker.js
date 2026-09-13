// Scope isolates hosted installations. Keep cached startup available during slow networks.
const CACHE_PREFIX = `CircuitPython-Online-IDE:${self.registration.scope}:`;
const CACHE_NAME = `${CACHE_PREFIX}v3`;
const shellUrl = new URL("index.html", self.registration.scope).href;
const urlsToCache = ["index.html", "tree-sitter-python.wasm", "blinka-192.png", "blinka-512.png", "blinka.svg"];

async function validShell(response) {
    if (!response.ok || response.redirected || !response.headers.get("content-type")?.includes("text/html")) return false;
    const html = await response.clone().text();
    // Reject common login/error pages; this is an application marker, not authentication.
    return /<title>\s*CircuitPython Online IDE\s*<\/title>/i.test(html) && /id=["']root["']/.test(html);
}

self.addEventListener("install", (event) => {
    event.waitUntil((async () => {
        const resources = await Promise.all(urlsToCache.map(async (path) => {
            const url = new URL(path, self.registration.scope).href;
            const response = await fetch(url);
            if (!response.ok || (url === shellUrl && !(await validShell(response)))) {
                throw new Error("Could not install the IDE offline resources.");
            }
            return [url, response];
        }));
        const cache = await caches.open(CACHE_NAME);
        await Promise.all(resources.map(([url, response]) => cache.put(url, response)));
    })());
});

self.addEventListener("activate", (event) => {
    event.waitUntil(caches.keys().then((names) => Promise.all(
        names.filter((name) => name !== CACHE_NAME &&
            (name.startsWith(CACHE_PREFIX) || name.startsWith("CircuitPython-Online-IDE-cache.")))
            .map((name) => caches.delete(name))
    )));
});

async function updateCache(request) {
    try {
        const response = await fetch(request);
        const isShell = request.mode === "navigate" || new URL(request.url).pathname === new URL(shellUrl).pathname;
        if (isShell && !(await validShell(response))) return undefined;
        if (response.ok) {
            try {
                const cache = await caches.open(CACHE_NAME);
                await cache.put(isShell ? shellUrl : request, response.clone());
            } catch (error) {
                console.warn("Could not cache IDE resource:", error);
            }
        }
        return response;
    } catch {
        return undefined;
    }
}

self.addEventListener("fetch", (event) => {
    const request = event.request;
    if (request.method !== "GET" || !request.url.startsWith(self.registration.scope)) return;
    const update = updateCache(request);
    event.waitUntil(update.then(() => {}));
    event.respondWith((async () => {
        try {
            const cache = await caches.open(CACHE_NAME);
            const cached = await cache.match(request) || (request.mode === "navigate" && await cache.match(shellUrl));
            if (cached) return cached;
        } catch (error) {
            console.warn("Could not read IDE cache:", error);
        }
        return await update || Response.error();
    })());
});
