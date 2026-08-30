// @requires python3
// The serial file source, exercised through the REAL consumer code.
//
// The point of this file is that nothing here is a mock of our own logic: it
// calls the same fileSystemUtils helpers FolderView, the editor and Backup call,
// against duck-typed handles, against a board that really runs the injected
// Python. If the handles diverge from what the File System Access API consumers
// expect, this is what catches it.

import { harness } from "./helpers/harness.js";
import { startFakeDevice } from "./helpers/fakeDevice.js";
import { createFsCache } from "../src/serialFs/fsCache";
import { makeSerialDirectoryHandle } from "../src/serialFs/serialHandles";
import * as ops from "../src/serialFs/deviceOps";
import {
    getFolderContent,
    getFileText,
    writeFileText,
    getFromPathIfExists,
    writeToPathStrict,
    checkPathExists,
    isFolder,
    getFolderTree,
    compareFolders,
} from "../src/utilComponents/react-local-file-system/utilities/fileSystemUtils";

const t = harness("serial file system, through real consumer code");
t.watch();

const device = startFakeDevice({
    "code.py": 'print("hello")\n',
    "boot_out.txt": "Adafruit CircuitPython 9.2.1 on 2024-11-20; Raspberry Pi Pico with rp2040\nBoard ID:raspberry_pi_pico\n",
    "lib/adafruit_bus/__init__.py": "x=1\n",
});

try {
    const cache = createFsCache(() => ops.walk(device.session));
    const ctx = { run: (fn) => fn(device.session), cache };
    const root = makeSerialDirectoryHandle(ctx, "");

    // FolderView's hot path.
    const top = await getFolderContent(root);
    const names = top
        .map((e) => e.name)
        .sort()
        .join(",");
    t.check("lists the board root", names === "boot_out.txt,code.py,lib", names);
    t.check(
        "getFolderContent can annotate the handles",
        top.every((e) => e.fullPath && e.parent === root && "extension" in e)
    );
    t.check(
        "isFolder distinguishes kinds",
        isFolder(top.find((e) => e.name === "lib")) && !isFolder(top.find((e) => e.name === "code.py"))
    );

    // Reading.
    t.check("getFileText reads a file", (await getFileText(top.find((e) => e.name === "code.py"))) === 'print("hello")\n');
    const bootOut = await getFromPathIfExists(root, "boot_out.txt");
    t.check("useBoardInfo's path works", bootOut.includes("raspberry_pi_pico"));

    // Writing.
    t.check("writeFileText reports success", (await writeFileText(top.find((e) => e.name === "code.py"), "print('edited')\n")) === true);
    t.check(
        "written text reads back",
        (await getFileText(await root.getFileHandle("code.py"))) === "print('edited')\n"
    );

    // Nested creation exercises mkdir -p.
    await writeToPathStrict(root, "lib/deep/nest/mod.py", "VALUE = 42\n");
    t.check("nested write", (await getFromPathIfExists(root, "lib/deep/nest/mod.py")) === "VALUE = 42\n");
    t.check(
        "checkPathExists agrees",
        (await checkPathExists(root, "lib/deep/nest")) && !(await checkPathExists(root, "nope/x"))
    );

    // Binary round trip, byte compared. Quote, backslash, newline, high bytes.
    const tricky = new Uint8Array([0, 1, 0x27, 0x5c, 0x0a, 0x0d, 0xff, 0xfe, 0x22]);
    const bin = await root.getFileHandle("blob.mpy", { create: true });
    const writable = await bin.createWritable();
    await writable.write(tricky);
    await writable.close();
    const readBack = new Uint8Array(await (await (await root.getFileHandle("blob.mpy")).getFile()).arrayBuffer());
    t.check(
        "binary round trip is byte exact",
        readBack.length === tricky.length && readBack.every((b, i) => b === tricky[i]),
        `${readBack.length} bytes`
    );

    // A filename with a quote and an astral character.
    const odd = "it's \u{1F40D}.py";
    await writeToPathStrict(root, odd, "ok\n");
    t.check("filename with quote and emoji", (await getFromPathIfExists(root, odd)) === "ok\n");

    // Recursive delete.
    await root.removeEntry("lib", { recursive: true });
    t.check(
        "recursive remove clears the subtree",
        !(await checkPathExists(root, "lib/deep/nest/mod.py")) && !(await checkPathExists(root, "lib"))
    );

    // Backup's path.
    await writeToPathStrict(root, "a/x.py", "1\n");
    const tree = await getFolderTree(root);
    t.check("getFolderTree walks", tree.length > 0 && tree.some((n) => n.children !== null));
    const diff = await compareFolders(root, root);
    t.check(
        "compareFolders finds no self-diff",
        diff.newFiles.length === 0 && diff.removedFiles.length === 0 && diff.editedFiles.length === 0
    );

    // The cache is what makes the source usable at all: FolderView re-lists on
    // every render, and each uncached listing would Ctrl-C the running program.
    device.resetExecCount();
    for (let i = 0; i < 20; i++) {
        await getFolderContent(root);
    }
    t.check("20 listings cost zero device round trips", device.execCount() === 0, `${device.execCount()} execs`);
} catch (error) {
    t.fail("unexpected error", error);
} finally {
    device.stop();
}

t.done();
