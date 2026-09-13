// Production builds inject a content revision and integrity hashes for all published assets.
const OFFLINE_BUILD = /* OFFLINE_BUILD */ null;
// Scope isolates hosted installations. Each release keeps its shell and resources together.
const CACHE_PREFIX = `CircuitPython-Online-IDE:${self.registration.scope}:`;
const CACHE_NAME = `${CACHE_PREFIX}${OFFLINE_BUILD?.version ?? "development-v4"}`;
const shellUrl = new URL("index.html", self.registration.scope).href;
const resources = new Map((OFFLINE_BUILD?.resources ??
    ["index.html", "tree-sitter-python.wasm", "blinka-192.png", "blinka-512.png", "blinka.svg"].map((path) => ({ path })))
    .map(({ path, integrity }) => [new URL(path, self.registration.scope).href, integrity]));

async function validShell(response) {
    if (!response.ok || response.redirected || !response.headers.get("content-type")?.includes("text/html")) return false;
    const html = await response.clone().text();
    // Reject common login/error pages; this is an application marker, not authentication.
    return /<title>\s*CircuitPython Online IDE\s*<\/title>/i.test(html) && /id=["']root["']/.test(html);
}

async function fetchResource(url, integrity) {
    const response = await fetch(url, { cache: "reload", redirect: "error", ...(integrity ? { integrity } : {}) });
    if (!response.ok || response.redirected || (url === shellUrl && !(await validShell(response)))) {
        throw new Error("Could not install the IDE offline resources.");
    }
    return response;
}

self.addEventListener("install", (event) => {
    event.waitUntil((async () => {
        // A missing file or hash mismatch rejects installation. The existing worker stays active.
        const responses = await Promise.all([...resources].map(async ([url, integrity]) =>
            [url, await fetchResource(url, integrity)]));
        const cache = await caches.open(CACHE_NAME);
        await Promise.all(responses.map(([url, response]) => cache.put(url, response)));
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
        if (response.ok) {
            try {
                const cache = await caches.open(CACHE_NAME);
                await cache.put(request, response.clone());
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
    const url = new URL(request.url);
    url.search = "";
    const resourceUrl = request.mode === "navigate" ? shellUrl : url.href;
    if (resources.has(resourceUrl)) {
        event.respondWith((async () => {
            let cache;
            try {
                cache = await caches.open(CACHE_NAME);
                const cached = await cache.match(resourceUrl);
                if (cached) return cached;
            } catch (error) {
                console.warn("Could not read IDE cache:", error);
            }
            // Recover an evicted entry only if it still matches this worker's release.
            let response;
            try { response = await fetchResource(resourceUrl, resources.get(resourceUrl)); }
            catch { return Response.error(); }
            try { await cache?.put(resourceUrl, response.clone()); }
            catch (error) { console.warn("Could not cache IDE resource:", error); }
            return response;
        })());
        return;
    }
    serveOtherResource(event);
});

// Resources outside the build manifest can refresh independently of the installed app.
function serveOtherResource(event) {
    const request = event.request;
    const update = updateCache(request);
    event.waitUntil(update.then(() => {}));
    event.respondWith((async () => {
        try {
            const cache = await caches.open(CACHE_NAME);
            const cached = await cache.match(request);
            if (cached) return cached;
        } catch (error) {
            console.warn("Could not read IDE cache:", error);
        }
        return await update || Response.error();
    })());
}
