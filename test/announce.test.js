// @requires python3
// Console summaries for serial file operations.
//
// Two jobs. Transparency: the console goes quiet during a transfer, so without a
// summary the user watches their program stop for no visible reason. And P5: the
// bytes a transaction consumes are never replayed, so after a write the board is
// already restarted while `serialOutput` still ends in the old `>>>`, and
// sendCode's readiness check (useSerialCommands.js) passes when it should not.
// A summary line makes that check fail instead, which is the safe direction.

import { harness } from "./helpers/harness.js";
import { startFakeDevice } from "./helpers/fakeDevice.js";
import SerialCommunication from "../src/hooks/useSerial/serial";
import runRawRepl, { displayPath } from "../src/serialFs/runRawRepl";
import { createFsCache } from "../src/serialFs/fsCache";
import { makeSerialDirectoryHandle } from "../src/serialFs/serialHandles";
import * as ops from "../src/serialFs/deviceOps";
import { getFileText, writeFileText } from "../src/utilComponents/react-local-file-system/utilities/fileSystemUtils";

const t = harness("console summaries");
t.watch();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- displayPath ----
t.check("displayPath strips the leading slash", displayPath("/lib/foo.py") === "lib/foo.py");
t.check("displayPath leaves a bare name alone", displayPath("code.py") === "code.py");
t.check("displayPath keeps the root readable", displayPath("") === "/");

// ---- announce reaches every listener, even mid-transaction ----
{
    const serial = new SerialCommunication();
    serial.port = { writable: true, readable: true };
    serial.writer = { write: async () => {} };
    serial.keepRunning = true;

    // Two listeners, standing in for the console and the agent's buffer. Both
    // are fed from readerCallbacks, which is why announce goes through there.
    let consoleText = "";
    let agentText = "";
    serial.registerReaderCallback("console", (d) => (consoleText += d));
    serial.registerReaderCallback("agent", (d) => (agentText += d));

    serial.announce("[IDE] wrote code.py");
    t.check("announce reaches the console", consoleText.includes("[IDE] wrote code.py"));
    t.check("announce reaches the agent buffer too", agentText.includes("[IDE] wrote code.py"));
    t.check("announce stands on its own line", consoleText.startsWith("\n") && consoleText.endsWith("\n"));

    // Device bytes are held back during a transaction, but our own line is not.
    const release = await serial.startTransaction();
    consoleText = "";
    serial._exclusive.buffer += "deadbeef"; // as readLoop would divert it
    serial.announce("[IDE] listed files");
    t.check("announce bypasses the exclusive tap", consoleText.includes("[IDE] listed files"), JSON.stringify(consoleText));
    t.check("and transfer bytes still do not leak", !consoleText.includes("deadbeef"));
    release();
    serial.keepRunning = false;
}

// ---- real operations produce the right summaries ----
{
    const device = startFakeDevice({ "code.py": "print(1)\n", "lib/mod.py": "x=1\n" });
    const announced = [];
    // A serial stand-in that records what would reach the console.
    const serial = {
        port: {},
        writer: {},
        startTransaction: async () => () => {},
        writeNow: async () => {},
        readUntil: async () => "",
        readExactly: async () => "",
        drainExclusive: () => {},
        announce: (text) => announced.push(text),
        write: () => {}, // the post-transaction Ctrl-D goes through here
    };
    try {
        // Drive the labels through runRawRepl, but let the fake device do the work.
        const run = (fn, opts) =>
            runRawRepl(
                { ...serial, startTransaction: async () => () => {} },
                async () => fn(device.session),
                opts
            );
        const cache = createFsCache(() => run((session) => ops.walk(session), { label: "listed files" }));
        const root = makeSerialDirectoryHandle({ run, cache }, "");

        await getFileText(await root.getFileHandle("code.py"));
        await writeFileText(await root.getFileHandle("code.py"), "print(2)\n");
        await root.getFileHandle("fresh.py", { create: true });
        await root.getDirectoryHandle("newdir", { create: true });
        await root.removeEntry("fresh.py");

        const joined = announced.join("\n");
        t.check("listing is announced", joined.includes("[IDE] listed files"), joined);
        t.check("read is announced with a clean path", joined.includes("[IDE] read code.py"));
        t.check("write is announced", joined.includes("[IDE] wrote code.py"));
        t.check("create is announced", joined.includes("[IDE] created fresh.py"));
        t.check("mkdir is announced", joined.includes("[IDE] created folder newdir"));
        t.check("delete is announced", joined.includes("[IDE] deleted fresh.py"));
        t.check("no leading slashes leak into the console", !/\[IDE\] \w+ \//.test(joined), joined);
    } catch (error) {
        t.fail("operation summaries", error);
    } finally {
        device.stop();
    }
}

// ---- a failure is announced, and kept to one line ----
{
    const announced = [];
    const serial = {
        port: {},
        writer: {},
        startTransaction: async () => () => {},
        writeNow: async () => {},
        readUntil: async () => "",
        readExactly: async () => "",
        drainExclusive: () => {},
        announce: (text) => announced.push(text),
        write: () => {},
    };
    const longError = new Error("Read-only filesystem\n\nHere is a long boot.py explanation\nover several lines");
    let threw = false;
    try {
        await runRawRepl(serial, async () => {
            throw longError;
        }, { label: "wrote code.py" });
    } catch {
        threw = true;
    }
    t.check("the original error still propagates", threw);
    t.check("the failure is announced", announced[0]?.startsWith("[IDE] wrote code.py failed:"), announced[0]);
    t.check("only the first line is shown", !announced[0]?.includes("boot.py explanation"), announced[0]);
    t.check("the summary stays one line", !announced[0]?.includes("\n"));
}

// ---- P5: after a write, the readiness check must NOT see a stale ">>>" ----
{
    // Reproduce what useSerialCommands.sendCode() inspects.
    const isReplReady = (serialOutput) => serialOutput.slice(-4, -1) === ">>>";

    const serial = new SerialCommunication();
    serial.port = { writable: true, readable: true };
    serial.writer = { write: async () => {} };
    serial.keepRunning = true;
    let serialOutput = "";
    serial.registerReaderCallback("console", (d) => (serialOutput += d));

    // The board was sitting at the prompt before the operation.
    serialOutput = "Adafruit CircuitPython 9.2.1\n>>> ";
    t.check("precondition: the check passes at the prompt", isReplReady(serialOutput));

    // A write happens. Its bytes are consumed by the transaction and never
    // replayed, so without a summary serialOutput would still end in ">>>"
    // while the board has actually restarted into code.py.
    const release = await serial.startTransaction();
    serial._exclusive.buffer = "";
    release();
    serial.announce("[IDE] wrote code.py");
    await sleep(5);

    t.check(
        "P5: the readiness check no longer passes on stale output",
        !isReplReady(serialOutput),
        JSON.stringify(serialOutput.slice(-24))
    );
    t.check("and the user can see why", serialOutput.includes("[IDE] wrote code.py"));
    serial.keepRunning = false;
}

// ---- restart must leave the board running code.py, not sitting at raw REPL ----
{
    // Ctrl-D means different things in the two REPLs. At raw REPL's ">" it
    // soft-reboots straight back INTO raw REPL, which left the board parked at
    // ">" running nothing. It has to be sent from the friendly ">>>" prompt, and
    // after the transaction is released so the reboot banner is not swallowed.
    const events = [];
    // writeNow is the in-transaction path, write is the out-of-transaction one.
    // Labelling them separately is the point: a Ctrl-D on the wrong path is
    // exactly the bug this guards against.
    const serial = {
        port: {},
        writer: {},
        startTransaction: async () => {
            events.push("acquire");
            return () => events.push("release");
        },
        writeNow: async (data) => {
            if (data.includes("\x01")) events.push("enter-raw");
            if (data.includes("\x02")) events.push("leave-raw");
            // The test fn below never calls exec(), so a \x04 here can only be a
            // reboot attempt from inside raw REPL.
            if (data.includes("\x04")) events.push("reboot-INSIDE-raw-repl");
        },
        readUntil: async (match) => match,
        readExactly: async () => "OK",
        drainExclusive: () => {},
        announce: (text) => events.push(`announce:${text}`),
        write: (data) => {
            if (data === "\x04") events.push("reboot-outside");
        },
    };

    await runRawRepl(serial, async () => "done", { restart: true, label: "wrote code.py" });

    const at = (name) => events.indexOf(name);
    const order = events.join(" | ");

    t.check("a restart does reboot the board", at("reboot-outside") >= 0, order);
    t.check(
        "the reboot is NOT sent from inside raw REPL",
        at("reboot-INSIDE-raw-repl") === -1,
        order
    );
    t.check("raw REPL is left first", at("leave-raw") >= 0 && at("leave-raw") < at("reboot-outside"), order);
    t.check(
        "the reboot comes after the transaction is released",
        at("release") >= 0 && at("release") < at("reboot-outside"),
        order
    );
    t.check(
        "the summary is announced before the reboot output",
        at("announce:[IDE] wrote code.py") >= 0 && at("announce:[IDE] wrote code.py") < at("reboot-outside"),
        order
    );

    // Without restart there must be no reboot on either path.
    events.length = 0;
    await runRawRepl(serial, async () => "done", { label: "read code.py" });
    t.check("a read does not reboot the board", !events.join(" | ").includes("reboot"), events.join(" | "));
}

t.done();
