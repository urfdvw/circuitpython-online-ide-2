import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { harness } from "./helpers/harness.js";
const t = harness("offline releases and failed updates");
t.watch();
const scope = "https://example.test/ide/";
const shell = scope + "index.html";
const prefix = `CircuitPython-Online-IDE:${scope}:`;
const stores = new Map();
const deleted = [];
const calls = [];
let putFails = false;
let readFails = false;
const html = (label) => `<title>CircuitPython Online IDE</title><div id="root">${label}</div>`;
const key = (request) => typeof request === "string" ? request : request.url;
const integrity = (bytes) => "sha256-" + createHash("sha256").update(bytes).digest("base64");
const release = (version) => ({ "index.html": html(version), "tree-sitter-python.wasm": "grammar-" + version,
    [`manifest-${version}.json`]: "{}", [`chunk-${version}.js`]: "/* " + version + " */" });
const oldFiles = release("old");
const newFiles = release("new");
let networkFiles = oldFiles;
let networkOverride;
const cacheFor = (name) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const entries = stores.get(name);
    return {
        match: async (request) => { if (readFails) throw new Error("Cache unavailable"); return entries.get(key(request))?.clone(); },
        put: async (request, response) => { if (putFails) throw new Error("Quota exceeded"); entries.set(key(request), response); },
    };
};
function worker(version, files) {
    const listeners = {};
    const manifest = { version, resources: Object.entries(files).map(([path, content]) => ({ path, integrity: integrity(content) })) };
    runInNewContext(readFileSync("public/service-worker.js", "utf8").replace("/* OFFLINE_BUILD */ null", JSON.stringify(manifest)), {
        self: { registration: { scope }, addEventListener: (name, callback) => { listeners[name] = callback; } },
        caches: {
            open: async (name) => { if (readFails) throw new Error("Cache unavailable"); return cacheFor(name); },
            keys: async () => [...stores.keys()],
            delete: async (name) => { deleted.push(name); return stores.delete(name); },
        },
        fetch: async (request, options = {}) => {
            const url = key(request);
            calls.push({ url, options });
            if (networkOverride) return networkOverride(url);
            const path = url.slice(scope.length);
            const content = networkFiles[path];
            if (content === undefined) return new Response("missing", { status: 404 });
            // Model the browser's fetch integrity check, including mixed-release deployments.
            if (options.integrity && options.integrity !== integrity(content)) throw new TypeError("Integrity mismatch");
            return new Response(content, { headers: { "content-type": path === "index.html" ? "text/html" : "application/octet-stream" } });
        },
        Response, URL, console: { warn() {} },
    });
    return {
        lifecycle(name) {
            let pending;
            listeners[name]({ waitUntil: (promise) => { pending = promise; } });
            return pending;
        },
        serve(request = { url: shell, method: "GET", mode: "navigate" }) {
            let response; let background;
            listeners.fetch({ request, respondWith: (promise) => { response = promise; }, waitUntil: (promise) => { background = promise; } });
            return { response, background };
        },
    };
}
const assetRequest = (path) => ({ url: scope + path, method: "GET", mode: "cors" });
async function rejects(promise) {
    try { await promise; return false; } catch { return true; }
}
try {
    stores.set("unrelated-app", new Map());
    stores.set("CircuitPython-Online-IDE:https://example.test/another/:old", new Map());
    stores.set("CircuitPython-Online-IDE-cache.20250716.001", new Map());
    const old = worker("old", oldFiles);
    await old.lifecycle("install");
    t.check("installation caches every release resource", stores.get(prefix + "old").size === Object.keys(oldFiles).length);
    t.check("installation bypasses HTTP cache and verifies integrity", calls.every(({ options }) =>
        options.cache === "reload" && options.redirect === "error" && options.integrity.startsWith("sha256-")));
    const before = calls.length;
    networkOverride = () => new Promise(() => {});
    const immediate = await Promise.race([old.serve().response, new Promise((resolve) => setTimeout(() => resolve(null), 100))]);
    t.check("cached startup does not wait for a stalled network", immediate && await immediate.text() === html("old"));
    t.check("installed resources are not independently revalidated", calls.length === before);
    networkOverride = undefined;
    networkFiles = { ...newFiles, "tree-sitter-python.wasm": oldFiles["tree-sitter-python.wasm"] };
    const next = worker("new", newFiles);
    t.check("mixed-release bytes reject the new installation", await rejects(next.lifecycle("install")));
    t.check("failed update leaves the old shell available", await (await old.serve().response).text() === html("old"));
    networkFiles = { ...newFiles }; delete networkFiles["chunk-new.js"];
    t.check("missing hashed asset rejects installation", await rejects(next.lifecycle("install")));
    t.check("failed resource download does not populate a partial release", !stores.has(prefix + "new"));
    networkFiles = newFiles;
    putFails = true;
    t.check("cache write failure rejects installation", await rejects(next.lifecycle("install")));
    putFails = false;
    t.check("cache write failure preserves old release", await (await old.serve().response).text() === html("old"));
    await next.lifecycle("install");
    t.check("waiting update does not replace the active shell", await (await old.serve().response).text() === html("old"));
    t.check("waiting update does not replace active grammar", await (await old.serve(assetRequest("tree-sitter-python.wasm")).response).text() === "grammar-old");
    networkOverride = () => { throw new Error("offline"); };
    await next.lifecycle("activate");
    t.check("activated release starts offline", await (await next.serve().response).text() === html("new"));
    t.check("new hashed assets work offline before any online page load", await (await next.serve(assetRequest("chunk-new.js")).response).text() === newFiles["chunk-new.js"]);
    t.check("activation preserves other apps and scopes", deleted.length === 2 && stores.has("unrelated-app") &&
        stores.has("CircuitPython-Online-IDE:https://example.test/another/:old") && !stores.has(prefix + "old"));
    const root = next.serve({ url: scope + "?from=bookmark", method: "GET", mode: "navigate" });
    t.check("root navigation uses canonical offline shell", await (await root.response).text() === html("new"));
    networkOverride = undefined;
    const badFiles = { ...newFiles, "index.html": "<html>Login required</html>" };
    networkFiles = badFiles;
    t.check("unrecognized HTML rejects installation even with a matching hash", await rejects(worker("bad", badFiles).lifecycle("install")));
    networkFiles = newFiles;
    readFails = true;
    t.check("cache read failure still permits a verified network response", await (await next.serve().response).text() === html("new"));
    readFails = false;
    stores.get(prefix + "new").delete(shell); putFails = true;
    t.check("cache write failure still permits a verified network response", await (await next.serve().response).text() === html("new"));
    putFails = false;
    networkFiles = oldFiles;
    t.check("evicted shell cannot be replaced with another release", (await next.serve().response).type === "error");
    t.check("POST is not intercepted", next.serve({ ...assetRequest("index.html"), method: "POST" }).response === undefined);
    t.check("external requests are not intercepted", next.serve({ ...assetRequest("index.html"), url: "https://api.github.com/data" }).response === undefined);
    networkOverride = () => { throw new Error("offline"); };
    const missing = next.serve(assetRequest("missing.png"));
    t.check("uncached offline assets return network errors", (await missing.response).type === "error"); await missing.background;
} catch (error) { t.fail("unexpected error", error); }
t.done();
