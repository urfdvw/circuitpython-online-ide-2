import { harness } from "./helpers/harness.js";
import { createSerialFileSystem } from "../src/serialFs/fileSystem";

const t = harness("serial file connection ownership");
t.watch();

// Minimal raw-REPL replies for a tree containing code.py. Commands are counted
// so stale operations must fail before sending anything to the replacement board.
function serialStub() {
    let eof = 0;
    let commands = 0;
    return {
        port: {}, writer: {},
        get commands() { return commands; },
        startTransaction: async () => () => {},
        writeNow: async () => { commands++; },
        readUntil: async (match) => match === "\x04"
            ? (++eof % 2 ? "f|1|2f636f64652e7079\n\x04" : "\x04") : match,
        readExactly: async () => "OK",
        drainExclusive() {}, announce() {}, write() { commands++; },
    };
}
async function rejects(fn) {
    try { await fn(); return false; } catch { return true; }
}
try {
    const serial = serialStub();
    const first = createSerialFileSystem(serial);
    const file = await first.rootDirHandle.getFileHandle("code.py");
    const writable = await file.createWritable();
    await writable.write("edits from board A");
    // Same port object, but a new writer: also covers reconnecting the same board.
    serial.writer = {};
    const before = serial.commands;
    t.check("old editor cannot save to a replacement connection", await rejects(() => writable.close()));
    t.check("old editor cannot read the replacement board", await rejects(() => file.getFile()));
    t.check("old directory cannot return cached handles after reconnect", await rejects(() => first.rootDirHandle.getFileHandle("code.py")));
    t.check("old batch cannot start after reconnect", await rejects(() => first.batch(async () => {})));
    t.check("stale operations send no commands", serial.commands === before);
    const second = createSerialFileSystem(serial);
    t.check("fresh handles can access the new connection", (await second.rootDirHandle.getFileHandle("code.py")).name === "code.py");
    serial.keepRunning = false;
    t.check("closing the port invalidates handles before teardown finishes", await rejects(() => second.rootDirHandle.getFileHandle("code.py")));
} catch (error) {
    t.fail("unexpected error", error);
}
t.done();
