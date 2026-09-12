import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { harness } from "./helpers/harness.js";
const t = harness("offline cache isolation and failures");
t.watch();
const scope = "https://example.test/ide/";
const listeners = {};
const entries = new Map();
const deleted = [];
let network;
let putFails = false;
const cache = {
    addAll: async (urls) => { t.check("offline installation includes the syntax grammar", urls.includes("tree-sitter-python.wasm")); },
    match: async (request) => entries.get(typeof request === "string" ? request : request.url)?.clone(),
    put: async (request, response) => { if (putFails) throw new Error("Quota exceeded"); entries.set(request.url, response); },
};
try {
    runInNewContext(readFileSync("public/service-worker.js", "utf8"), {
        self: { registration: { scope }, addEventListener: (name, callback) => { listeners[name] = callback; } },
        caches: {
            open: async () => cache,
            keys: async () => ["unrelated-app", `CircuitPython-Online-IDE:${scope}:v1`,
                "CircuitPython-Online-IDE:https://example.test/another/:v1", "CircuitPython-Online-IDE-cache.20250716.001"],
            delete: async (name) => { deleted.push(name); },
        },
        fetch: async () => { if (network instanceof Error) throw network; return network.clone(); },
        Response, URL, console: { warn() {} },
    });
    let pending;
    const waitUntil = (promise) => { pending = promise; };
    listeners.install({ waitUntil }); await pending;
    listeners.activate({ waitUntil }); await pending;
    t.check("activation removes only this application's obsolete caches", deleted.length === 2 && !deleted.includes("unrelated-app"));
    const request = { url: scope + "index.html", method: "GET", mode: "navigate" };
    const serve = async (req = request) => {
        let response;
        listeners.fetch({ request: req, respondWith: (promise) => { response = promise; } });
        return response;
    };
    entries.set(request.url, new Response("old"));
    network = new Response("fresh");
    t.check("online requests receive fresh code", await (await serve()).text() === "fresh");
    network = new Error("offline");
    t.check("offline requests receive the saved response", await (await serve()).text() === "fresh");
    t.check("offline root navigation falls back to index.html", await (await serve({ ...request, url: scope })).text() === "fresh");
    network = new Response("available"); putFails = true;
    t.check("cache write failure does not break network responses", await (await serve()).text() === "available");
    t.check("POST is not intercepted", await serve({ ...request, method: "POST" }) === undefined);
    t.check("external requests are not cached", await serve({ ...request, url: "https://api.github.com/data" }) === undefined);
    network = new Error("offline");
    t.check("uncached offline asset returns a network error", (await serve({ ...request, mode: "cors", url: scope + "missing.png" })).type === "error");
} catch (error) { t.fail("unexpected error", error); }
t.done();
