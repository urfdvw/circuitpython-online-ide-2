import React from "react";
import { harness } from "./helpers/harness.js";
import SerialCommunication from "../src/hooks/useSerial/serial";
import useSerialCommands from "../src/hooks/useSerial/useSerialCommands";
import runRawRepl, { withSerialSession } from "../src/serialFs/runRawRepl";

const t = harness("REPL readiness after file operations");
t.watch();
const serial = new SerialCommunication();
serial.port = {};
serial.writer = {};
serial.writeNow = async () => {};
let failExit = false;
serial.readUntil = async (match) => {
    if (failExit && match === ">>> ") throw new Error("Friendly prompt timed out");
    return match;
};
let consoleOutput = "\n>>> ";
let agentOutput = consoleOutput;
serial.registerReaderCallback("console", text => { consoleOutput += text; });
serial.registerReaderCallback("agent", text => { agentOutput += text; });
const sent = [];

function sendCode() {
    const dispatcher = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher;
    const previous = dispatcher.current;
    let commands;
    try {
        dispatcher.current = { useState: value => [value, () => {}] };
        // Exercise the actual Send Code action without mounting an editor.
        // eslint-disable-next-line react-hooks/rules-of-hooks
        commands = useSerialCommands(async data => { sent.push(data); }, consoleOutput, true);
    } finally {
        dispatcher.current = previous;
    }
    return commands.sendCode("print(1)", false, { silent: true });
}

try {
    await runRawRepl(serial, async () => "contents", { label: "read code.py" });
    t.check("read summary is followed by the confirmed prompt", consoleOutput.endsWith("[IDE] read code.py\n>>> "));
    t.check("console and agent receive the same prompt", consoleOutput === agentOutput);
    t.check("Send Code works immediately after a file read", (await sendCode()).ok && sent.length === 1);

    await withSerialSession(serial, async run => {
        await run(async () => "a");
        await run(async () => "b");
    }, { label: "scanned installed libraries" });
    t.check("Send Code works after a read-only batch", (await sendCode()).ok && sent.length === 2);

    await runRawRepl(serial, async () => "contents");
    t.check("unlabelled reads also restore the prompt", (await sendCode()).ok && sent.length === 3);

    await runRawRepl(serial, async () => {}, { restart: true, label: "wrote code.py" });
    t.check("saving still requests a reboot", serial.writeBuffer.includes("\x04"));
    t.check("Send Code stays blocked after a save restarts the board", !(await sendCode()).ok && sent.length === 3);

    let originalError;
    try {
        await runRawRepl(serial, async () => { throw new Error("File not found"); }, { label: "read missing.py" });
    } catch (error) { originalError = error; }
    t.check("a failed read preserves its original error", originalError?.message === "File not found");
    t.check("confirmed prompt remains usable after a failed read", (await sendCode()).ok && sent.length === 4);

    failExit = true;
    await runRawRepl(serial, async () => "contents", { label: "read code.py" });
    t.check("failed REPL exit never fabricates readiness", !(await sendCode()).ok && sent.length === 4);
    t.check("failed exit still releases the transaction", serial._exclusive === null);
} catch (error) {
    t.fail("unexpected error", error);
}
t.done();
