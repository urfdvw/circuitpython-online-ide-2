// @requires python3
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { harness } from "./helpers/harness.js";
import { startFakeDevice } from "./helpers/fakeDevice.js";
import SerialCommunication from "../src/hooks/useSerial/serial";
import { createSerialFileSystem } from "../src/serialFs/fileSystem";

const t = harness("serial batch file integration");
t.watch();
const device = startFakeDevice({ "code.py": "print(1)\n" });
const serial = new SerialCommunication();
serial.port = {};
serial.writer = {};
let command = "", handshakes = 0, reboots = 0;
const receive = (data) => {
    serial._exclusive.buffer += data;
    serial._exclusive.notify?.();
};
// Feed the real transaction reader and raw-REPL protocol. Python executes each
// assembled command against the temporary board filesystem.
serial.writeNow = async (data) => {
    if (data === "\x03") return;
    if (data === "\r\x01") {
        handshakes++;
        receive("raw REPL; CTRL-B to exit\r\n>");
    } else if (data === "\r\x02") {
        receive(">>> ");
    } else if (data === "\x04") {
        const code = command;
        command = "";
        let out = "", err = "";
        try { out = await device.session.exec(code); } catch (error) { err = error.message; }
        receive(`OK${out}\x04${err}\x04>`);
    } else {
        command += data;
    }
};
serial.write = () => { reboots++; };
serial.announce = () => {};
try {
    const fs = createSerialFileSystem(serial);
    let inside, resume;
    const started = new Promise(r => { inside = r; });
    const gate = new Promise(r => { resume = r; });
    const contents = ["A".repeat(513), "B".repeat(769)];
    const batch = fs.batch(async (root) => {
        inside();
        await gate;
        // Both complete writes must be serialized, including all their chunks.
        await Promise.all(contents.map(async (text, i) => {
            const handle = await root.getFileHandle(`file${i}.py`, { create: true });
            const writable = await handle.createWritable();
            await writable.write(text);
            await writable.close();
        }));
        t.check("multi-file batch uses one handshake", handshakes === 1);
        t.check("batch does not reboot between writes", reboots === 0);
    });
    await started;
    // This cache walk is queued behind the active batch. Its presence must not
    // deadlock the scoped root's first directory lookup.
    const outside = fs.rootDirHandle.getFileHandle("code.py");
    resume();
    await Promise.all([batch, outside]);
    t.check("one reboot for the completed batch", reboots === 1);
    for (let i = 0; i < contents.length; i++) {
        t.check(`file ${i} has its own complete contents`, readFileSync(join(device.root, `file${i}.py`), "utf8") === contents[i]);
    }
    t.check("outside cache sees files created by the batch", (await fs.rootDirHandle.getFileHandle("file1.py")).name === "file1.py");
    t.check("transaction released after all operations", serial._exclusive === null);
} catch (error) {
    t.fail("unexpected error", error);
} finally {
    device.stop();
}
t.done();
