// @requires python3
// The agent bridge against the serial file source.
//
// The bridge reuses fileSystemUtils rather than reimplementing file logic, so
// the whole file API should work on the duck-typed handles unchanged. This file
// proves that, and pins the two things the agent has to be told about: which
// source is active, and that a serial listing is a cache it may need to refresh.

import { harness } from "./helpers/harness.js";
import { startFakeDevice } from "./helpers/fakeDevice.js";
import { createFsCache } from "../src/serialFs/fsCache";
import { makeSerialDirectoryHandle } from "../src/serialFs/serialHandles";
import * as ops from "../src/serialFs/deviceOps";
import { store, attachAgentBridge, detachAgentBridge } from "../src/components/agentBridge/cpyAgentBridge";
import { setAgentBridgeEnabled } from "../src/components/agentBridge/agentBridgeSwitch";
import {
    path2Handles,
    getFromPath,
    getFolderTree,
    isFolder,
    renameEntry,
    moveEntry,
    removeEntry,
    writeToPathStrict,
    getParentAndHandleFromPath,
    checkPathExists,
} from "../src/utilComponents/react-local-file-system/utilities/fileSystemUtils";

const t = harness("agent bridge on the serial file source");
t.watch();

const device = startFakeDevice({
    "code.py": "print(1)\n",
    "lib/mod.py": "x=1\n",
    "notes.md": "# hi\n",
});

try {
    const cache = createFsCache(() => ops.walk(device.session));
    const root = makeSerialDirectoryHandle({ run: (fn) => fn(device.session), cache }, "");

    // Every fileSystemUtils function the bridge imports, on serial handles.
    t.check("listFiles (getFolderTree)", (await getFolderTree(root)).length === 3);
    t.check("isFolder", isFolder(await root.getDirectoryHandle("lib")));
    t.check("readFile (getFromPath)", (await getFromPath(root, "code.py")) === "print(1)\n");
    t.check("exists (checkPathExists)", (await checkPathExists(root, "lib/mod.py")) && !(await checkPathExists(root, "no.py")));

    await writeToPathStrict(root, "new/deep.py", "y=2\n");
    t.check("writeFile creates intermediate folders", (await getFromPath(root, "new/deep.py")) === "y=2\n");

    const { fileHandle } = await path2Handles(root, "code.py", { create: false, treatLastAsFile: true });
    t.check("path2Handles resolves a file", fileHandle?.kind === "file");

    const { parent, handle } = await getParentAndHandleFromPath(root, "notes.md");
    t.check("getParentAndHandleFromPath", parent?.kind === "directory" && handle?.name === "notes.md");

    await renameEntry(parent, handle, "renamed.md");
    t.check("renameEntry", await checkPathExists(root, "renamed.md"));
    t.check("renameEntry preserves contents", (await getFromPath(root, "renamed.md")) === "# hi\n");

    const moved = await getParentAndHandleFromPath(root, "renamed.md");
    await moveEntry(moved.parent, moved.handle, await root.getDirectoryHandle("lib"));
    t.check("moveEntry", (await checkPathExists(root, "lib/renamed.md")) && !(await checkPathExists(root, "renamed.md")));

    const doomed = await getParentAndHandleFromPath(root, "lib/renamed.md");
    await removeEntry(doomed.parent, doomed.handle);
    t.check("deleteEntry", !(await checkPathExists(root, "lib/renamed.md")));

    // Folder rename goes through a recursive copy-then-delete.
    const dir = await getParentAndHandleFromPath(root, "new");
    await renameEntry(dir.parent, dir.handle, "renamedDir");
    t.check("renameEntry on a folder", await checkPathExists(root, "renamedDir/deep.py"));

    // ---- the window.__cpyAgent surface itself ----
    //
    // Exercised for real rather than by inspecting `store`, because the API is
    // wrapped in a bridge-on gate and a broken wiring would still leave the
    // store fields present.
    // Minimal window stand-in: the switch confirms with the user and announces
    // changes with an event, neither of which node provides.
    globalThis.window = globalThis;
    globalThis.window.confirm = () => true;
    globalThis.window.dispatchEvent = () => true;
    globalThis.window.addEventListener = () => {};
    globalThis.window.removeEventListener = () => {};

    let refreshCalls = 0;
    store.fileSource = "usb_serial";
    store.refreshFileSource = () => {
        refreshCalls += 1;
        cache.invalidate();
    };

    attachAgentBridge();
    const agent = globalThis.window.__cpyAgent;
    t.check("the bridge attaches an API", Boolean(agent));

    // Every method is gated while the bridge is off.
    setAgentBridgeEnabled(false);
    let gated = false;
    try {
        await agent.refreshFiles();
    } catch {
        gated = true;
    }
    t.check("refreshFiles is gated while the bridge is off", gated);

    setAgentBridgeEnabled(true);
    t.check("status() reports the file source", (await agent.status()).fileSource === "usb_serial");
    t.check("help() lists refreshFiles", "refreshFiles()" in (await agent.help()).files);

    // A serial listing is a cache: a file the BOARD wrote stays invisible until
    // refreshed. This is the whole reason refreshFiles() exists.
    await device.session.exec(`f=open('/log.csv','w')\nf.write('1,2\\n')\nf.close()`);
    t.check("a board-written file is not visible yet", !(await checkPathExists(root, "log.csv")));

    const result = await agent.refreshFiles();
    t.check("refreshFiles reaches the file source", refreshCalls === 1, `calls=${refreshCalls}`);
    t.check("refreshFiles reports back", result.ok === true && result.fileSource === "usb_serial");
    t.check("and the board-written file now appears", await checkPathExists(root, "log.csv"));

    // ---- the "not ready" report must match the actual file source ----
    //
    // This is the failure that matters most in practice: the agent relays the
    // message to a human, so telling a serial-mode user to open a CIRCUITPY
    // drive sends them looking for something that does not exist.
    const savedHandle = store.rootDirHandle;
    store.rootDirHandle = null;
    store.rootFolderReady = false;

    store.fileSource = "usb_serial";
    const serialStatus = await agent.status();
    t.check("serial: not ready is reported", serialStatus.fileAccess.ready === false);
    t.check("serial: source is reported", serialStatus.fileAccess.source === "usb_serial");
    t.check(
        "serial: does NOT tell the user to open a folder",
        !/open .*(folder|drive)|Folder View/i.test(serialStatus.fileAccess.needs),
        serialStatus.fileAccess.needs
    );
    t.check("serial: asks for the serial port instead", /serial port/i.test(serialStatus.fileAccess.needs));
    t.check(
        "serial: notes mention the cache and the interruption",
        serialStatus.fileAccess.notes.some((n) => /refreshFiles/.test(n)) &&
            serialStatus.fileAccess.notes.some((n) => /interrupt/i.test(n))
    );

    let serialError = "";
    try {
        await agent.readFile("code.py");
    } catch (e) {
        serialError = String(e.message);
    }
    t.check(
        "serial: the file error agrees with status()",
        /serial port/i.test(serialError) && !/Folder View|folder picker/i.test(serialError),
        serialError
    );

    store.fileSource = "usb_mass_storage";
    const driveStatus = await agent.status();
    t.check("drive: asks for the drive", /CIRCUITPY drive/i.test(driveStatus.fileAccess.needs));
    t.check("drive: notes say the listing is live", driveStatus.fileAccess.notes.some((n) => /live/i.test(n)));

    let driveError = "";
    try {
        await agent.readFile("code.py");
    } catch (e) {
        driveError = String(e.message);
    }
    t.check("drive: the file error agrees with status()", /Folder View|CIRCUITPY/i.test(driveError), driveError);

    store.rootDirHandle = savedHandle;
    store.rootFolderReady = true;

    detachAgentBridge();
    setAgentBridgeEnabled(false);
} catch (error) {
    t.fail("unexpected error", error);
} finally {
    device.stop();
}

t.done();
