// Device side of the manual "filesystem write access" tool.
//
// While CIRCUITPY is mounted on the host, the host owns write access and the VM
// does not, so every write over raw REPL fails with errno 30.
//
// Two ways out, and we prefer the safe one:
//
//   1. storage.remount("/", readonly=False). Present on every firmware, and
//      usable at runtime, but only once the host has let go of the drive:
//      otherwise it raises RuntimeError("Cannot remount path when visible via
//      USB."). The docs suggest ejecting the drive, and that is exactly what
//      makes this safe. The eject is what guarantees the host finished writing,
//      so there is no corruption window at all.
//
//   2. storage.unsafe_disable_usb_drive(). Yanks the drive away from the host
//      with no eject, so it works without any user action, but it can corrupt
//      the filesystem if the host was mid-write. It is also NOT in any released
//      firmware yet: it exists only on CircuitPython main (PR #11124, merged
//      2026-07-22), so 9.x and 10.0.0 boards do not have it.
//
// So option 1 is the default path and option 2 is offered only as an explicit
// override, and only when the board actually has it.
//
// Nothing here runs on its own. Every function is behind a button, because each
// call is a raw REPL round trip that interrupts the running program.

import { BOOT_PY_FALLBACK } from "./errors";

export { BOOT_PY_FALLBACK };

/** Read-only state, classified. */
export const STATE = {
    WRITABLE: "writable",
    USB_CLAIM: "usb-claim",
    BOOT_PY: "boot-py",
    NOT_CIRCUITPYTHON: "not-circuitpython",
    UNKNOWN: "unknown",
};

const MARKER = "RUNTIME_STATUS";

function parsePyValue(token) {
    if (token === "True") return true;
    if (token === "False") return false;
    return null;
}

/**
 * Ask the board who currently owns write access, and whether it can switch.
 *
 * One exec returns all three values. Two dimensions are needed because
 * `readonly` alone says we cannot write but not why, and the two reasons lead to
 * different advice.
 *
 * @returns {Promise<{state: string, readonly: boolean|null, usbConnected: boolean|null,
 *                    canForce: boolean, summary: string, detail: string}>}
 */
export async function queryStorageState(session) {
    const out = await session.exec(`try:
 import storage
 _ro=storage.getmount("/").readonly
 _cap=hasattr(storage,"unsafe_disable_usb_drive")
except Exception:
 _ro=None
 _cap=False
try:
 import supervisor
 _usb=supervisor.runtime.usb_connected
except Exception:
 _usb=None
print("${MARKER}",_ro,_usb,_cap)`);

    const line = out
        .split("\n")
        .map((l) => l.trim())
        .find((l) => l.startsWith(MARKER));
    if (!line) {
        return {
            state: STATE.UNKNOWN,
            readonly: null,
            usbConnected: null,
            canForce: false,
            summary: "Could not read the board's filesystem state.",
            detail: "The board answered, but not in the expected format.\n\n---\n\n" + BOOT_PY_FALLBACK,
        };
    }

    const [, roToken, usbToken, capToken] = line.split(/\s+/);
    const readonly = parsePyValue(roToken);
    const usbConnected = parsePyValue(usbToken);
    // Whether the board also has the no-eject override. remount() is always there.
    const canForce = parsePyValue(capToken) === true;

    return { readonly, usbConnected, canForce, ...classify(readonly, usbConnected) };
}

const EJECT_ADVICE =
    "\n\nTo hand write access to the board: eject (safely remove) the CIRCUITPY drive on this " +
    "computer, then press \"Give write access to CircuitPython\". Ejecting is what makes this safe, " +
    "because it guarantees your computer has finished writing.\n\n" +
    "If that does not work, use the boot.py method below.";

function classify(readonly, usbConnected) {
    if (readonly === null) {
        return {
            state: STATE.NOT_CIRCUITPYTHON,
            summary: "This board has no storage module.",
            detail:
                "It does not look like a CircuitPython board, so this tool does not apply. " +
                "On MicroPython the filesystem is always writable by the board and there is nothing to switch.",
        };
    }
    if (readonly === false) {
        return {
            state: STATE.WRITABLE,
            summary: "CircuitPython currently has write access.",
            detail:
                "Saving files over serial will work. The CIRCUITPY drive is either not mounted on this " +
                "computer, or write access has already been handed to the board.",
        };
    }
    if (usbConnected === true) {
        return {
            state: STATE.USB_CLAIM,
            summary: "Your computer currently has write access.",
            detail:
                "This is the normal state: while CIRCUITPY is mounted here, the computer owns write " +
                "access and the board does not, so saving over serial fails. Only one side can write at " +
                "a time, because the filesystem has no locking between them." +
                EJECT_ADVICE +
                "\n\n---\n\n" +
                BOOT_PY_FALLBACK,
        };
    }
    return {
        state: STATE.BOOT_PY,
        summary: "Neither side has write access.",
        detail:
            "The CIRCUITPY drive is not mounted here, but the board is still read-only to itself, which " +
            "usually means boot.py did not remount it. Pressing \"Give write access to CircuitPython\" " +
            "should work now, since your computer has already let go of the drive.\n\n---\n\n" +
            BOOT_PY_FALLBACK,
    };
}

/** Raised when the host still has CIRCUITPY mounted, so remount() refused. */
export class DriveStillMountedError extends Error {
    constructor() {
        super(
            "The CIRCUITPY drive is still mounted on this computer, so the board cannot take write " +
                "access yet." +
                EJECT_ADVICE +
                "\n\n---\n\n" +
                BOOT_PY_FALLBACK
        );
        this.name = "DriveStillMountedError";
    }
}

// The firmware's wording when the host still holds the drive.
const STILL_VISIBLE = "Cannot remount path when visible via USB";

/**
 * Hand write access to CircuitPython the safe way.
 *
 * Requires the user to have ejected the drive first. That is a feature, not a
 * limitation: the eject is what guarantees the host finished writing.
 *
 * @throws {DriveStillMountedError} when the drive has not been ejected
 */
export async function giveWriteAccessToBoard(session) {
    try {
        await session.exec(
            `import storage
storage.remount("/", readonly=False)
print("REMOUNTED_RW")`,
            20000
        );
    } catch (error) {
        if (String(error?.message || "").includes(STILL_VISIBLE)) {
            throw new DriveStillMountedError();
        }
        throw error;
    }
}

/**
 * Hand write access to CircuitPython WITHOUT an eject.
 *
 * Only available on firmware that has unsafe_disable_usb_drive(), which as of
 * now means CircuitPython main rather than any release. Can corrupt the
 * filesystem if the host is mid-write, so this is only ever reached through an
 * explicit second confirmation.
 */
export async function forceWriteAccessToBoard(session) {
    await session.exec(
        `import storage
storage.unsafe_disable_usb_drive()
print("DISABLED")`,
        20000
    );
}

/**
 * Give write access back to the host.
 *
 * enable_usb_drive() is the counterpart to the forced path and makes the drive
 * reappear on its own. After the eject-based path there is nothing to re-enable,
 * so the board is just set back to read-only and the drive returns when it is
 * next re-enumerated.
 */
export async function giveWriteAccessToHost(session) {
    return await session.exec(
        `import storage
_back=False
try:
 storage.enable_usb_drive()
 _back=True
except Exception:
 pass
try:
 storage.remount("/", readonly=True)
except Exception:
 pass
print("RESTORED",_back)`,
        20000
    );
}
