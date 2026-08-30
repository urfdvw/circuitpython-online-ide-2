// Holding one raw REPL session open across a batch of file operations.
//
// Without this, every file read pays its own Ctrl-C, handshake and Ctrl-B, so
// scanning twenty installed libraries interrupted the running program twenty
// times. The assertions below are about that count: what matters is not that the
// batch works, but that it collapses N handshakes into one.

import { harness } from "./helpers/harness.js";
import runRawRepl, { withSerialSession } from "../src/serialFs/runRawRepl";

const t = harness("batched serial sessions");
t.watch();

/**
 * A serial stand-in that counts what a real board would have had to sit through.
 */
function countingSerial() {
    const counts = { transactions: 0, interrupts: 0, enterRaw: 0, leaveRaw: 0, reboots: 0 };
    const announced = [];
    return {
        counts,
        announced,
        port: {},
        writer: {},
        startTransaction: async () => {
            counts.transactions += 1;
            return () => {};
        },
        writeNow: async (data) => {
            if (data.includes("\x03")) counts.interrupts += 1;
            if (data.includes("\x01")) counts.enterRaw += 1;
            if (data.includes("\x02")) counts.leaveRaw += 1;
        },
        readUntil: async (match) => match,
        readExactly: async () => "OK",
        drainExclusive: () => {},
        announce: (text) => announced.push(text),
        write: (data) => {
            if (data === "\x04") counts.reboots += 1;
        },
    };
}

const FILES = 20;

try {
    // ---- the baseline this exists to improve on ----
    {
        const serial = countingSerial();
        for (let i = 0; i < FILES; i++) {
            await runRawRepl(serial, async () => `file ${i}`, { label: `read f${i}.py` });
        }
        t.check(`unbatched: ${FILES} files cost ${FILES} handshakes`, serial.counts.enterRaw === FILES, String(serial.counts.enterRaw));
        t.check(`unbatched: and ${FILES} interruptions`, serial.counts.interrupts === FILES, String(serial.counts.interrupts));
        t.check(`unbatched: and ${FILES} announcements`, serial.announced.length === FILES, String(serial.announced.length));
    }

    // ---- the same work inside one batch ----
    {
        const serial = countingSerial();
        const results = [];
        await withSerialSession(
            serial,
            async () => {
                for (let i = 0; i < FILES; i++) {
                    results.push(await runRawRepl(serial, async () => `file ${i}`, { label: `read f${i}.py` }));
                }
            },
            { label: "scanned installed libraries" }
        );

        t.check("batched: one handshake for the whole batch", serial.counts.enterRaw === 1, String(serial.counts.enterRaw));
        t.check("batched: the board is interrupted once", serial.counts.interrupts === 1, String(serial.counts.interrupts));
        t.check("batched: one transaction", serial.counts.transactions === 1, String(serial.counts.transactions));
        t.check("batched: raw REPL is left once", serial.counts.leaveRaw === 1, String(serial.counts.leaveRaw));
        t.check("batched: every operation still ran", results.length === FILES);
        t.check(
            "batched: only the batch announces, not each file",
            serial.announced.length === 1 && serial.announced[0].includes("scanned installed libraries"),
            JSON.stringify(serial.announced)
        );
    }

    // ---- restart bubbles up: one reboot, not one per write ----
    {
        const serial = countingSerial();
        await withSerialSession(
            serial,
            async () => {
                for (let i = 0; i < FILES; i++) {
                    await runRawRepl(serial, async () => null, { restart: true, label: `wrote f${i}.py` });
                }
            },
            { label: "installed a library" }
        );
        t.check("batched: one reboot for many writes", serial.counts.reboots === 1, String(serial.counts.reboots));
    }

    // ---- a batch with no writes must not reboot at all ----
    {
        const serial = countingSerial();
        await withSerialSession(serial, async () => {
            await runRawRepl(serial, async () => null, { label: "read a.py" });
        }, { label: "scanned" });
        t.check("a read-only batch does not reboot", serial.counts.reboots === 0, String(serial.counts.reboots));
    }

    // ---- the session must be released even when the batch throws ----
    {
        const serial = countingSerial();
        let threw = false;
        try {
            await withSerialSession(serial, async () => {
                throw new Error("boom");
            }, { label: "scanned" });
        } catch {
            threw = true;
        }
        t.check("a failing batch propagates", threw);
        t.check("a failing batch still leaves raw REPL", serial.counts.leaveRaw === 1, String(serial.counts.leaveRaw));
        t.check("the failure is announced", serial.announced[0]?.includes("failed: boom"), JSON.stringify(serial.announced));

        // The critical part: the session must not be left registered, or every
        // later operation would try to reuse a dead one.
        const after = countingSerial.call(null);
        await runRawRepl(serial, async () => null, { label: "read a.py" });
        t.check("the session is cleaned up after a failure", serial.counts.enterRaw === 2, String(serial.counts.enterRaw));
        void after;
    }

    // ---- nesting a batch inside a batch reuses the outer one ----
    {
        const serial = countingSerial();
        await withSerialSession(serial, async () => {
            await withSerialSession(serial, async () => {
                await runRawRepl(serial, async () => null);
            }, { label: "inner" });
        }, { label: "outer" });
        t.check("nested batches share one handshake", serial.counts.enterRaw === 1, String(serial.counts.enterRaw));
        t.check("only the outer batch announces", serial.announced.length === 1 && serial.announced[0].includes("outer"), JSON.stringify(serial.announced));
    }
} catch (error) {
    t.fail("unexpected error", error);
}

t.done();
