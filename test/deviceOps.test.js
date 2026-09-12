// @requires python3
// The injected Python, executed for real against the fake board.
//
// These cover the mistakes that are invisible until a board is attached: a
// create that truncates, a failed write that leaves a temp file, a filename with
// whitespace, a save that leaves the board parked at the REPL.

import { harness } from "./helpers/harness.js";
import { startFakeDevice } from "./helpers/fakeDevice.js";
import { createFsCache } from "../src/serialFs/fsCache";
import { makeSerialDirectoryHandle } from "../src/serialFs/serialHandles";
import * as ops from "../src/serialFs/deviceOps";
import {
    getFromPath,
    getFileText,
    isEntryHealthy,
} from "../src/utilComponents/react-local-file-system/utilities/fileSystemUtils";

const t = harness("device operations");
t.watch();

// ---- create must never truncate ----
{
    const device = startFakeDevice({ "code.py": 'print("old")\n' });
    try {
        const cache = createFsCache(() => ops.walk(device.session));
        const root = makeSerialDirectoryHandle({ run: (fn) => fn(device.session), cache }, "");

        // Populate the cache BEFORE boot.py exists. The serial cache is never
        // auto-invalidated, so anything the board writes afterwards is a cache
        // miss, which is exactly the path that used to truncate.
        await cache.ensure();
        await device.session.exec(
            `f=open('/boot.py','w')\nf.write('import usb_cdc\\nusb_cdc.enable(data=True)\\n')\nf.close()`
        );
        t.check("the file is genuinely a cache miss", (await cache.stat("/boot.py")) === null);

        const handle = await root.getFileHandle("boot.py", { create: true });
        const contents = await getFileText(handle);
        t.check("getFileHandle({create}) preserves an existing file", contents.includes("usb_cdc.enable"), JSON.stringify(contents));

        // The reported path: path2Handles defaults to create:true, so merely
        // reading boot.py goes down the create branch.
        const viaPath = await getFromPath(root, "boot.py");
        t.check("reading through getFromPath does not zero it", viaPath.includes("usb_cdc.enable"));
    } catch (error) {
        t.fail("truncation checks", error);
    } finally {
        device.stop();
    }
}

// ---- writes restart the board, reads do not ----
{
    const device = startFakeDevice({ "code.py": 'print("old")\n' });
    const restarts = [];
    try {
        const cache = createFsCache(() => ops.walk(device.session));
        const root = makeSerialDirectoryHandle(
            {
                run: (fn, opts) => {
                    if (opts?.restart) restarts.push(1);
                    return fn(device.session);
                },
                cache,
            },
            ""
        );

        const handle = await root.getFileHandle("code.py");
        const writable = await handle.createWritable();
        await writable.write("print('new')\n");
        await writable.close();
        t.check("saving asks for a soft reboot", restarts.length >= 1, `restarts=${restarts.length}`);

        restarts.length = 0;
        await getFileText(await root.getFileHandle("code.py"));
        t.check("reading does not reboot the board", restarts.length === 0, `restarts=${restarts.length}`);
    } catch (error) {
        t.fail("restart checks", error);
    } finally {
        device.stop();
    }
}

// ---- names with edge whitespace survive the walk ----
{
    const device = startFakeDevice({});
    try {
        await device.session.exec(`f=open('/log .txt','w')\nf.write('spaced')\nf.close()`);
        const cache = createFsCache(() => ops.walk(device.session));
        const root = makeSerialDirectoryHandle({ run: (fn) => fn(device.session), cache }, "");
        const names = (await cache.list("")).map((e) => e.name);
        t.check("a trailing space is not trimmed away", names.includes("log .txt"), JSON.stringify(names));
        t.check("and the file is still reachable", (await getFileText(await root.getFileHandle("log .txt"))) === "spaced");
    } catch (error) {
        t.fail("filename checks", error);
    } finally {
        device.stop();
    }
}

// ---- a deleted directory reads as unhealthy, not empty ----
{
    const device = startFakeDevice({});
    try {
        const cache = createFsCache(() => ops.walk(device.session));
        const root = makeSerialDirectoryHandle({ run: (fn) => fn(device.session), cache }, "");
        await root.getDirectoryHandle("gone", { create: true });
        const dir = await root.getDirectoryHandle("gone");
        t.check("a live directory is healthy", (await isEntryHealthy(dir)) === true);
        await root.removeEntry("gone", { recursive: true });
        t.check("a deleted directory is not healthy", (await isEntryHealthy(dir)) === false);
    } catch (error) {
        t.fail("health checks", error);
    } finally {
        device.stop();
    }
}

// ---- a failed write cleans up its temp file ----
{
    const device = startFakeDevice({});
    try {
        const big = new TextEncoder().encode("x".repeat(600)); // several chunks

        await ops.writeFile(device.session, "ok.py", big);
        t.check("a normal write still works", device.listRoot().includes("ok.py") && !device.listRoot().includes(".ide-tmp"));

        device.resetExecCount();
        device.failNextExecAt(3);
        let err = null;
        try {
            await ops.writeFile(device.session, "boom.py", big);
        } catch (e) {
            err = e;
        }
        t.check("the original error propagates", /No space left/.test(String(err?.message)), String(err?.message).slice(0, 40));
        device.failNextExecAt(null);
        const after = device.listRoot();
        t.check("no .ide-tmp is left behind", !after.includes(".ide-tmp"), JSON.stringify(after));
        t.check("the target file was not created", !after.includes("boom.py"), JSON.stringify(after));
    } catch (error) {
        t.fail("cleanup checks", error);
    } finally {
        device.stop();
    }
}

t.done();
