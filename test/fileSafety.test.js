// @requires python3
import { harness } from "./helpers/harness.js";
import { startFakeDevice } from "./helpers/fakeDevice.js";
import { createFsCache } from "../src/serialFs/fsCache";
import { makeSerialDirectoryHandle } from "../src/serialFs/serialHandles";
import * as ops from "../src/serialFs/deviceOps";
import {
    backupFolder, copyEntry, renameEntry, moveEntry, getFromPath, getParentAndHandleFromPath,
    writeToPathStrict, checkPathExists, writeFileData, removeEntry,
} from "../src/utilComponents/react-local-file-system/utilities/fileSystemUtils";
import { ensureDataSerialInBoot } from "../src/components/Widgets/installConnectedVariables";

const t = harness("file operations preserve user data on failure");
t.watch();
const device = startFakeDevice({
    "source.py": "original", "folder/.secret": "hidden", "folder/nested/code.py": "code",
    "project.v1/README": "no extension", " spaced.py ": "spaces",
});
const rejects = async (name, operation) => {
    try { await operation(); t.check(name, false, "unexpected success"); }
    catch { t.check(name, true); }
};
try {
    const cache = createFsCache(() => ops.walk(device.session));
    const root = makeSerialDirectoryHandle({ run: (fn) => fn(device.session), cache }, "");
    t.check("extensionless reads in dotted folders", await getFromPath(root, "project.v1/README") === "no extension");
    t.check("path whitespace is preserved", await getFromPath(root, " spaced.py ") === "spaces");
    const parent = await getParentAndHandleFromPath(root, "project.v1/README");
    t.check("parent lookup treats a dotted folder as a directory", parent.parent.name === "project.v1");
    await rejects("reading a missing file rejects", () => getFromPath(root, "missing.py"));
    t.check("reading does not create a file", !(await checkPathExists(root, "missing.py")));
    const folder = await root.getDirectoryHandle("folder");
    await renameEntry(root, folder, "renamed");
    t.check("renaming preserves hidden files", await getFromPath(root, "renamed/.secret") === "hidden");
    t.check("renaming preserves nested files", await getFromPath(root, "renamed/nested/code.py") === "code");
    const renamed = await root.getDirectoryHandle("renamed");
    const nested = await renamed.getDirectoryHandle("nested");
    await rejects("copy into a descendant rejects", () => copyEntry(renamed, nested, "copy"));
    await rejects("clean backup into itself rejects", () => backupFolder(renamed, renamed, true));
    await rejects("clean backup into an ancestor rejects", () => backupFolder(nested, renamed, true));
    t.check("overlap rejection precedes deletion", await getFromPath(root, "renamed/nested/code.py") === "code");
    const source = await root.getFileHandle("source.py");
    const failure = new Error("disk full");
    let aborted = 0;
    const failingFile = { name: "failed.py", kind: "file", createWritable: async () => ({
        write: async () => { throw failure; }, close: async () => {}, abort: async () => { aborted++; },
    }) };
    const failingTarget = {
        ...root,
        isSameEntry: async () => false,
        getFileHandle: async (name, options) => {
            if (options?.create) return failingFile;
            throw new DOMException("Missing", "NotFoundError");
        },
        getDirectoryHandle: async () => { throw new DOMException("Missing", "NotFoundError"); },
    };
    await rejects("failed move propagates the copy error", () => moveEntry(root, source, failingTarget));
    t.check("failed move preserves the source", await getFromPath(root, "source.py") === "original");
    await rejects("failed rename propagates the copy error", () => renameEntry(failingTarget, source, "failed.py"));
    t.check("failed rename preserves the source", await getFromPath(root, "source.py") === "original");
    t.check("failed writes abort their streams", aborted === 2);
    const closeFailure = { createWritable: async () => ({ write: async () => {},
        close: async () => { throw failure; }, abort: async () => { throw new Error("already closed"); },
    }) };
    try { await writeFileData(closeFailure, "new"); }
    catch (error) { t.check("abort errors do not hide the write error", error === failure); }
    await rejects("delete failures propagate", () => removeEntry({ removeEntry: async () => { throw failure; } }, source));
    await writeToPathStrict(root, "occupied.py", "keep");
    await rejects("rename cannot overwrite an existing entry", () => renameEntry(root, source, "occupied.py"));
    t.check("existing destination is unchanged", await getFromPath(root, "occupied.py") === "keep");
    let bootWrites = 0;
    await rejects("unreadable boot.py is not treated as missing", () => ensureDataSerialInBoot({
        getFileHandle: async () => { throw new DOMException("Denied", "NotAllowedError"); },
    }, async () => { bootWrites++; }));
    t.check("boot.py read failures prevent writes", bootWrites === 0);
} catch (error) { t.fail("unexpected error", error); }
finally { device.stop(); }
t.done();
