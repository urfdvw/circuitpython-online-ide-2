// Holding one raw REPL session open across a batch of file operations.
//
// Without this, every file read pays its own Ctrl-C, handshake and Ctrl-B, so
// scanning twenty installed libraries interrupted the running program twenty
// times. The assertions below are about that count: what matters is not that the
// batch works, but that it collapses N handshakes into one.

import { harness } from "./helpers/harness.js";
import SerialCommunication from "../src/hooks/useSerial/serial";
import runRawRepl, { withSerialSession } from "../src/serialFs/runRawRepl";

const t = harness("batched serial sessions");
t.watch();

/**
 * A serial stand-in that counts what a real board would have had to sit through.
 */
function countingSerial() {
    const counts = { transactions: 0, interrupts: 0, enterRaw: 0, leaveRaw: 0, reboots: 0 };
    const announced = [];
    const serial = new SerialCommunication();
    const startTransaction = serial.startTransaction.bind(serial);
    return Object.assign(serial, {
        counts,
        announced,
        port: {},
        writer: {},
        startTransaction: async () => {
            counts.transactions += 1;
            return startTransaction();
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
    });
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
            async (run) => {
                for (let i = 0; i < FILES; i++) {
                    results.push(await run(async () => `file ${i}`, { label: `read f${i}.py` }));
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
            async (run) => {
                for (let i = 0; i < FILES; i++) {
                    await run(async () => null, { restart: true, label: `wrote f${i}.py` });
                }
            },
            { label: "installed a library" }
        );
        t.check("batched: one reboot for many writes", serial.counts.reboots === 1, String(serial.counts.reboots));
    }

    // ---- a batch with no writes must not reboot at all ----
    {
        const serial = countingSerial();
        await withSerialSession(serial, async (run) => {
            await run(async () => null, { label: "read a.py" });
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
        await runRawRepl(serial, async () => null, { label: "read a.py" });
        t.check("the session is cleaned up after a failure", serial.counts.enterRaw === 2, String(serial.counts.enterRaw));
    }

    // Only an explicitly passed runner shares the batch, including nested helpers.
    {
        const serial = countingSerial();
        await withSerialSession(serial, async (run) => {
            const nested = async (runner) => runner(async () => null);
            await nested(run);
        }, { label: "outer" });
        t.check("nested helper shares one handshake", serial.counts.enterRaw === 1);
    }

    // An unrelated read arriving during handshake must wait for the full batch.
    {
        const serial = countingSerial();
        let entered, proceed;
        const entering = new Promise(r => { entered = r; });
        const gate = new Promise(r => { proceed = r; });
        const readUntil = serial.readUntil;
        serial.readUntil = async (match) => {
            if (match.includes("raw REPL") && serial.counts.enterRaw === 1) {
                entered();
                await gate;
            }
            return readUntil(match);
        };
        const events = [];
        const batch = withSerialSession(serial, async (run) => {
            await run(async (session) => { await session.exec("print(1)"); events.push("batch"); });
        });
        await entering;
        const other = runRawRepl(serial, async (session) => {
            await session.exec("print(2)"); events.push("other");
        });
        await Promise.resolve();
        t.check("unrelated read waits through handshake", events.length === 0);
        proceed();
        await Promise.all([batch, other]);
        t.check("unrelated read runs after batch", events.join() === "batch,other", events.join());
        t.check("independent callers use separate transactions", serial.counts.transactions === 2);
    }

    // Parallel operations within one explicit batch cannot share device globals.
    {
        const serial = countingSerial();
        let running = 0, maxRunning = 0, lateRun;
        await withSerialSession(serial, async (run) => {
            lateRun = run;
            await Promise.all([1, 2].map(() => run(async () => {
                running++; maxRunning = Math.max(maxRunning, running);
                await new Promise(r => setTimeout(r, 5));
                running--;
            })));
        });
        t.check("operations inside a batch are serialized", maxRunning === 1);
        let rejected = false;
        try { await lateRun(async () => {}); } catch { rejected = true; }
        t.check("batch runner cannot escape its lifetime", rejected);
    }

    // Connection identity is checked after waiting in the transaction queue.
    {
        const serial = countingSerial();
        const release = await serial.startTransaction();
        let ran = false;
        const pending = runRawRepl(serial, async () => { ran = true; }, { restart: true });
        const observed = pending.catch(error => error);
        serial.writer = {};
        release();
        const error = await observed;
        t.check("queued operation rejects a replacement connection", error instanceof Error && !ran);
        t.check("replacement board receives no interrupt or reboot", serial.counts.interrupts === 0 && serial.counts.reboots === 0);
    }
    // Cleanup must never send Ctrl-B or a reboot to a newly connected board.
    {
        const serial = countingSerial();
        let rejected = false;
        try {
            await runRawRepl(serial, async (session) => {
                serial.writer = {};
                await session.exec("print(1)");
            }, { restart: true });
        } catch { rejected = true; }
        t.check("disconnect during an operation fails that operation", rejected);
        t.check("cleanup never writes to the replacement board", serial.counts.leaveRaw === 0 && serial.counts.reboots === 0);
        t.check("failed connection still releases the transaction", serial._exclusive === null);
    }
} catch (error) {
    t.fail("unexpected error", error);
}

t.done();
