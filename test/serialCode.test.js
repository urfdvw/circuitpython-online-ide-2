// @requires python3
import React from "react";
import { execFileSync } from "node:child_process";
import { harness } from "./helpers/harness.js";
import useSerialCommands from "../src/hooks/useSerial/useSerialCommands";
import SerialCommunication from "../src/hooks/useSerial/serial";
import { fromHex } from "../src/serialFs/pythonRepr";
import { makeSerialFileHandle, makeSerialDirectoryHandle } from "../src/serialFs/serialHandles";

const t = harness("serial source text and channel isolation");
t.watch();
const dispatcher = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher;
const previous = dispatcher.current;
try {
    dispatcher.current = { useState: (initial) => [initial, () => {}] };
    let sent;
    // The test dispatcher supplies the hook state without mounting a UI.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const commands = useSerialCommands(async (text) => { sent = text; }, "\n>>> ", true);
    const code = 'value = """first\n\nlast"""\nprint(repr(value))\nprint("it\'s 🐍")\n';
    await commands.sendCode(code);
    const output = execFileSync("python3", ["-c", sent], { encoding: "utf8" });
    t.check("multiline string content survives sending", output === "'first\\n\\nlast'\nit's 🐍\n", output);
    const serial = new SerialCommunication();
    const chunks = [...new TextEncoder().encode("hello 🐍 café")].map((byte) => new Uint8Array([byte]));
    serial.port = { readable: true };
    serial.reader = { read: async () => chunks.length ? { value: chunks.shift(), done: false } : { done: true } };
    let received = "";
    serial.registerReaderCallback("test", (text) => { received += text; });
    await serial.readLoop();
    t.check("UTF-8 split across USB packets survives", received === "hello 🐍 café", received);
    let closed = 0;
    serial.close = async () => { closed++; };
    serial._onDisconnect({ target: {} });
    t.check("another port disconnect leaves this channel open", closed === 0);
    serial._onDisconnect({ target: serial.port });
    t.check("own port disconnect closes this channel", closed === 1);
    serial._onDisconnect({ port: serial.port });
    t.check("legacy port event shape is supported", closed === 2);
    for (const malformed of ["0", "0g", "001"]) {
        let rejected = false;
        try { fromHex(malformed); } catch { rejected = true; }
        t.check(`corrupted hex is rejected: ${malformed}`, rejected);
    }
    const firstSource = {};
    const secondSource = {};
    const firstFile = makeSerialFileHandle(firstSource, "/code.py");
    const secondFile = makeSerialFileHandle(secondSource, "/code.py");
    t.check("same path on another connection is a different file", !(await firstFile.isSameEntry(secondFile)));
    t.check("directory cannot resolve a file on another connection", await makeSerialDirectoryHandle(firstSource, "").resolve(secondFile) === null);
    t.check("batch contexts preserve source identity", await makeSerialFileHandle({ identity: firstSource }, "/code.py").isSameEntry(firstFile));
} catch (error) { t.fail("unexpected error", error); }
finally { dispatcher.current = previous; }
t.done();
