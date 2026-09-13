import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { harness } from "./helpers/harness.js";
const t = harness("offline startup and safe background updates");
t.watch();
const scope = "https://example.test/ide/";
const shell = scope + "index.html";
const listeners = {};
const entries = new Map();
const deleted = [];
const html = (label) => `<title>CircuitPython Online IDE</title><div id="root">${label}</div>`;
const page = (label) => new Response(html(label), { headers: { "content-type": "text/html" } });
let network = page("installed");
let putFails = false;
const key = (request) => typeof request === "string" ? request : request.url;
const cache = {
    match: async (request) => entries.get(key(request))?.clone(),
    put: async (request, response) => { if (putFails) throw new Error("Quota exceeded"); entries.set(key(request), response); },
};
try {
    runInNewContext(readFileSync("public/service-worker.js", "utf8"), {
        self: { registration: { scope }, addEventListener: (name, callback) => { listeners[name] = callback; } },
        caches: {
            open: async () => cache,
            keys: async () => ["unrelated-app", `CircuitPython-Online-IDE:${scope}:v2`,
                "CircuitPython-Online-IDE:https://example.test/another/:v2", "CircuitPython-Online-IDE-cache.20250716.001"],
            delete: async (name) => { deleted.push(name); },
        },
        fetch: async () => { if (typeof network === "function") return network(); if (network instanceof Error) throw network; return network.clone(); },
        Response, URL, console: { warn() {} },
    });
    let pending;
    const waitUntil = (promise) => { pending = promise; };
    listeners.install({ waitUntil }); await pending;
    t.check("offline installation includes syntax grammar", entries.has(scope + "tree-sitter-python.wasm"));
    listeners.activate({ waitUntil }); await pending;
    t.check("activation preserves other applications and scopes", deleted.length === 2 && !deleted.includes("unrelated-app"));
    const request = { url: shell, method: "GET", mode: "navigate" };
    const serve = (req = request) => {
        let response; let background;
        listeners.fetch({ request: req, respondWith: (promise) => { response = promise; }, waitUntil: (promise) => { background = promise; } });
        return { response, background };
    };
    let finishNetwork;
    network = () => new Promise((resolve) => { finishNetwork = resolve; });
    const slow = serve();
    const immediate = await Promise.race([slow.response, new Promise((resolve) => setTimeout(() => resolve(null), 100))]);
    t.check("cached startup does not wait for a stalled network", immediate && (await immediate.text()) === html("installed"));
    finishNetwork(page("fresh")); await slow.background;
    t.check("background update installs the next load's shell", await (await cache.match(shell)).text() === html("fresh"));
    network = new Error("offline");
    const offline = serve();
    t.check("offline startup serves the saved shell", await (await offline.response).text() === html("fresh")); await offline.background;
    const root = serve({ ...request, url: scope });
    t.check("root navigation uses canonical shell cache", await (await root.response).text() === html("fresh")); await root.background;
    network = new Response("<html>Login required</html>", { headers: { "content-type": "text/html" } });
    const portal = serve(); await portal.response; await portal.background;
    t.check("unrecognized HTML cannot replace offline shell", await (await cache.match(shell)).text() === html("fresh"));
    listeners.install({ waitUntil });
    try { await pending; t.check("bad shell install rejected", false); }
    catch { t.check("bad shell install preserves working cache", await (await cache.match(shell)).text() === html("fresh")); }
    network = page("available"); putFails = true; entries.delete(shell);
    const uncached = serve();
    t.check("cache failure still permits first online load", await (await uncached.response).text() === html("available")); await uncached.background;
    t.check("POST is not intercepted", serve({ ...request, method: "POST" }).response === undefined);
    t.check("external requests are not intercepted", serve({ ...request, url: "https://api.github.com/data" }).response === undefined);
    network = new Error("offline");
    const missing = serve({ ...request, mode: "cors", url: scope + "missing.png" });
    t.check("uncached offline assets return network errors", (await missing.response).type === "error"); await missing.background;
} catch (error) { t.fail("unexpected error", error); }
t.done();
