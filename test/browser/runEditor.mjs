// Start Vite and an isolated Chrome with remote debugging before running this script.
import { checkEditor } from "./checkEditor.js";
const origin = process.env.REVIEW_IDE_ORIGIN || "http://127.0.0.1:5176";
const debugging = process.env.REVIEW_CDP_ORIGIN || "http://127.0.0.1:9341";
const tabs = await fetch(debugging + "/json/list").then((response) => response.json());
const tab = tabs.find((entry) => entry.type === "page" && entry.url.startsWith(origin)) || tabs.find((entry) => entry.type === "page" && entry.url === "about:blank");
if (!tab) throw new Error("Open an about:blank tab in the isolated test browser.");
const socket = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
});
const pending = new Map();
let nextId = 0;
socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data);
    const task = pending.get(message.id);
    if (!task) return;
    clearTimeout(task.timer); pending.delete(message.id);
    if (message.error) task.reject(new Error(JSON.stringify(message.error)));
    else task.resolve(message.result);
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(method + " timed out")); }, 20000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
});
try {
    await send("Page.enable");
    await send("Page.navigate", { url: origin + "/test/browser/editor.html" });
    const result = await send("Runtime.evaluate", {
        expression: `(${checkEditor.toString()})()`, awaitPromise: true, returnByValue: true, userGesture: true,
    });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    console.log(JSON.stringify(result.result.value, null, 2));
} finally {
    for (const task of pending.values()) clearTimeout(task.timer);
    socket.close();
}
