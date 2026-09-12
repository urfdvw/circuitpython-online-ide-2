// The manual "filesystem write access" tool.
//
// The subtle part is what we are allowed to conclude. supervisor.runtime
// .usb_connected reports USB enumeration (tud_ready()), not whether the host
// holds the drive, so it must not drive the advice: after ejecting CIRCUITPY the
// USB serial interface is still up and it stays true.

import { harness } from "./helpers/harness.js";
import {
    queryStorageState,
    giveWriteAccessToBoard,
    forceWriteAccessToBoard,
    giveWriteAccessToHost,
    DriveStillMountedError,
    BOOT_PY_FALLBACK,
    STATE,
} from "../src/serialFs/storageControl";
import { deviceError } from "../src/serialFs/errors";

const t = harness("storage control");
t.watch();

/** A session that always answers with one canned line. */
const answering = (out) => ({ exec: async () => out + "\n" });

try {
    // Released firmware, board cannot write, no no-eject override.
    const readOnly = await queryStorageState(answering("RUNTIME_STATUS True True False"));
    t.check("no override on released firmware", readOnly.canForce === false);
    t.check("read-only is a single state", readOnly.state === STATE.READ_ONLY, readOnly.state);
    t.check("advises ejecting", readOnly.detail.includes("eject"));
    t.check("always offers boot.py", readOnly.detail.includes("boot.py") && readOnly.detail.includes("RESET"));
    t.check(
        "does not claim the computer owns the filesystem",
        !/computer currently has write access/i.test(readOnly.summary),
        readOnly.summary
    );
    t.check("covers the already-ejected case", readOnly.detail.includes("already ejected"));
    t.check("usb_connected is kept only as a diagnostic", readOnly.usbConnected === true);

    const writable = await queryStorageState(answering("RUNTIME_STATUS False True True"));
    t.check("writable board detected", writable.state === STATE.WRITABLE && writable.canForce === true);

    t.check(
        "a board with no storage module",
        (await queryStorageState(answering("RUNTIME_STATUS None None False"))).state === STATE.NOT_CIRCUITPYTHON
    );
    t.check("unparseable output", (await queryStorageState(answering("nonsense"))).state === STATE.UNKNOWN);

    // Actions: the drive is still mounted, so remount() refuses.
    const mounted = {
        exec: async (code) => {
            if (code.includes("RUNTIME_STATUS")) return "RUNTIME_STATUS True True False\n";
            if (code.includes("readonly=False")) {
                throw deviceError("RuntimeError: Cannot remount path when visible via USB.");
            }
            return "";
        },
    };
    let err = null;
    try {
        await giveWriteAccessToBoard(mounted);
    } catch (e) {
        err = e;
    }
    t.check("a mounted drive gives a typed error", err instanceof DriveStillMountedError);
    t.check("that error explains both remedies", err.message.includes("eject") && err.message.includes("boot.py"));

    let ok = true;
    try {
        await giveWriteAccessToBoard(answering("REMOUNTED_RW"));
    } catch {
        ok = false;
    }
    t.check("remount succeeds once the host lets go", ok);

    const bleedingEdge = {
        exec: async (code) => (code.includes("RUNTIME_STATUS") ? "RUNTIME_STATUS True True True\n" : "DISABLED\n"),
    };
    t.check("override offered when the firmware has it", (await queryStorageState(bleedingEdge)).canForce === true);
    let forced = true;
    try {
        await forceWriteAccessToBoard(bleedingEdge);
    } catch {
        forced = false;
    }
    t.check("the override runs", forced);

    let restored = true;
    try {
        await giveWriteAccessToHost(mounted);
    } catch {
        restored = false;
    }
    t.check("restoring tolerates a missing enable_usb_drive", restored);

    t.check(
        "errno 30 carries the boot.py fallback",
        deviceError("OSError: [Errno 30] Read-only filesystem", "code.py").message.includes("boot.py")
    );
    t.check("the fallback insists on a hard reset", BOOT_PY_FALLBACK.includes("Ctrl-D is NOT enough"));
} catch (error) {
    t.fail("unexpected error", error);
}

t.done();
