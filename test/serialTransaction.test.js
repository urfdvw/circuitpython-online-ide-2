// Exclusive access to the shared serial port.
//
// The file system borrows the same connection the REPL console uses, because a
// USB CDC console endpoint cannot be opened twice. These tests pin down the
// rules that make that safe: console traffic is held (not dropped) during a
// transfer, reads time out sensibly, and transactions never interleave.

import { harness } from "./helpers/harness.js";
import SerialCommunication from "../src/hooks/useSerial/serial";

const t = harness("serial transaction and read semantics");
t.watch();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** A SerialCommunication with a fake port, plus a way to feed it bytes. */
function makeSerial({ onWrite } = {}) {
    const serial = new SerialCommunication();
    const written = [];
    const decoder = new TextDecoder();
    serial.port = { writable: true, readable: true };
    serial.writer = {
        write: async (bytes) => {
            if (onWrite) await onWrite(decoder.decode(bytes));
            written.push(decoder.decode(bytes));
        },
    };
    serial.keepRunning = true;
    serial.writeLoop();
    // Mirrors what the patched readLoop does with an incoming chunk.
    const feed = (data) => {
        if (serial._exclusive) {
            serial._exclusive.buffer += data;
            if (serial._exclusive.notify) serial._exclusive.notify();
            return;
        }
        for (const id in serial.readerCallbacks) serial.readerCallbacks[id](data);
    };
    return { serial, written, feed };
}

try {
    // ---- reads are diverted away from the console during a transaction ----
    {
        const { serial, feed } = makeSerial();
        let consoleText = "";
        serial.registerReaderCallback("console", (d) => (consoleText += d));

        feed("normal output");
        t.check("console receives output when idle", consoleText === "normal output");

        const release = await serial.startTransaction();
        feed("deadbeef");
        t.check("transfer bytes do not reach the console", consoleText === "normal output", JSON.stringify(consoleText));

        setTimeout(() => feed(">OK"), 5);
        const got = await serial.readUntil("OK", 1000);
        t.check("readUntil returns through the match", got === "deadbeef>OK", JSON.stringify(got));
        t.check("buffer is consumed exactly", serial._exclusive.buffer === "");

        setTimeout(() => feed("abcdef"), 5);
        t.check("readExactly takes only what was asked", (await serial.readExactly(3, 1000)) === "abc");
        t.check("the remainder stays buffered", serial._exclusive.buffer === "def");

        // The idle timeout restarts per byte, so a slow but talking board is fine.
        serial._exclusive.buffer = "";
        const slow = serial.readUntil("END", 120);
        for (let i = 0; i < 8; i++) setTimeout(() => feed("."), 30 * (i + 1));
        setTimeout(() => feed("END"), 30 * 9);
        t.check("idle timeout restarts on every byte", (await slow).endsWith("END"));

        // A silent board still fails, and reports what it had seen.
        serial._exclusive.buffer = "";
        feed("partial");
        let timedOut = null;
        try {
            await serial.readUntil("NEVER", 60);
        } catch (e) {
            timedOut = e;
        }
        t.check("a silent board times out", Boolean(timedOut) && timedOut.seen === "partial");

        release();
        feed("!");
        t.check("console resumes after release", consoleText === "normal output!");
        serial.keepRunning = false;
    }

    // ---- writes are held, not dropped ----
    {
        const { serial, written } = makeSerial();
        const release = await serial.startTransaction();
        written.length = 0;
        serial.write("\x03"); // the toolbar stop button
        serial.write("print('junk')\r"); // console typing
        await sleep(40);
        t.check("console writes are held during a transaction", written.length === 0, JSON.stringify(written));

        await serial.writeNow("w('deadbeef')");
        t.check("the transaction's own writes go out", written.join("") === "w('deadbeef')");

        written.length = 0;
        release();
        await sleep(60);
        t.check(
            "held writes replay after release",
            written.join("") === "\x03print('junk')\r",
            JSON.stringify(written.join(""))
        );
        serial.keepRunning = false;
    }

    // ---- a write already in flight must land before a transaction starts ----
    {
        const order = [];
        const { serial } = makeSerial({
            onWrite: async () => {
                order.push("write-start");
                await sleep(30);
                order.push("write-end");
            },
        });
        serial.write("in-flight");
        await sleep(5); // let writeLoop block inside writer.write
        const release = await serial.startTransaction();
        order.push("tx-acquired");
        release();
        t.check(
            "startTransaction waits out an in-flight write",
            order.join(",") === "write-start,write-end,tx-acquired",
            order.join(",")
        );
        serial.keepRunning = false;
    }

    // ---- the old `writeBuffer = []` dropped anything queued mid-drain ----
    {
        let serialRef = null;
        const { serial, written } = makeSerial({
            onWrite: async (text) => {
                if (text === "A") serialRef.write("B");
                await sleep(2);
            },
        });
        serialRef = serial;
        serial.write("A");
        await sleep(60);
        t.check("nothing queued mid-drain is dropped", written.join("") === "AB", JSON.stringify(written.join("")));
        serial.keepRunning = false;
    }

    // ---- transactions serialise ----
    {
        const { serial } = makeSerial();
        const order = [];
        const a = serial.startTransaction().then(async (rel) => {
            order.push("a-start");
            await sleep(30);
            order.push("a-end");
            rel();
        });
        const b = serial.startTransaction().then((rel) => {
            order.push("b-start");
            order.push("b-end");
            rel();
        });
        await Promise.all([a, b]);
        t.check("transactions do not interleave", order.join(",") === "a-start,a-end,b-start,b-end", order.join(","));
        serial.keepRunning = false;
    }

    // ---- closing the port must not strand a transaction ----
    {
        const { serial } = makeSerial();
        await serial.startTransaction();
        const pending = serial.readUntil("NEVER", 60000);
        let rejected = null;
        pending.catch((e) => (rejected = e));
        await serial.close();
        await sleep(20);
        t.check("close() clears the exclusive tap", serial._exclusive === null);
        t.check("close() fails the pending read immediately", Boolean(rejected), String(rejected?.message || ""));
    }
} catch (error) {
    t.fail("unexpected error", error);
}

t.done();
