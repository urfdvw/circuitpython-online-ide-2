import { Writable } from "node:stream";
import { harness } from "./helpers/harness.js";
import { createTransferTimeout, pipeRelease } from "../proxy cloud function/transfer.js";
const t = harness("proxy progress timeouts");
t.watch();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
try {
    const controller = new AbortController();
    const timeout = createTransferTimeout(controller, { headersMs: 30, idleMs: 100 });
    timeout.progress();
    let chunks = 0; let output = "";
    const body = new ReadableStream({ async pull(stream) {
        if (chunks++ === 8) { stream.close(); return; }
        await sleep(20); stream.enqueue(new TextEncoder().encode("chunk"));
    } });
    const destination = new Writable({ write(chunk, encoding, done) { output += chunk.toString(); done(); } });
    try {
        await pipeRelease(body, destination, { signal: controller.signal, progress: timeout.progress });
        t.check("progressing download exceeds total deadline without truncation", !controller.signal.aborted && output === "chunk".repeat(8));
    } finally { timeout.dispose(); }
    const stalled = new AbortController();
    const idle = createTransferTimeout(stalled, { headersMs: 500, idleMs: 20 });
    let canceled = false;
    idle.progress();
    try {
        await pipeRelease(new ReadableStream({ pull() {}, cancel() { canceled = true; } }),
            new Writable({ write(chunk, encoding, done) { done(); } }), { signal: stalled.signal, progress: idle.progress });
        t.check("stalled stream aborts", false);
    } catch {
        t.check("stalled stream aborts and cancels upstream", stalled.signal.aborted && canceled);
    } finally { idle.dispose(); }
    const noHeaders = new AbortController();
    const headers = createTransferTimeout(noHeaders, { headersMs: 15 });
    await sleep(30); headers.dispose();
    t.check("header wait remains bounded", noHeaders.signal.aborted);
    const finished = new AbortController();
    const clean = createTransferTimeout(finished, { headersMs: 10 }); clean.dispose();
    await sleep(20);
    t.check("completed request has no lingering timeout", !finished.signal.aborted);
} catch (error) { t.fail("unexpected error", error); }
t.done();
