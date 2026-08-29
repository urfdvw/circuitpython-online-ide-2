// Turns a device traceback into a typed JS error.
//
// The important one is errno 30. On a normal CircuitPython board the host owns
// CIRCUITPY, so the VM cannot write and every write over raw REPL fails this way.
// We put the whole explanation in `.message` so it surfaces through the existing
// `confirm("Write to file failed. " + error.message)` in fileSystemUtils.js
// without any caller needing to know this error type exists.

/**
 * The universal fallback. Works on every firmware and every board, needs no REPL
 * feature at all, and is what we point at whenever anything else is unsupported
 * or fails.
 *
 * Lives here because this module imports nothing, so both the error messages and
 * storageControl can use it without an import cycle.
 */
export const BOOT_PY_FALLBACK =
    "Always works, on any firmware:\n\n" +
    "1. Create or edit boot.py in the root of CIRCUITPY and put these two lines in it:\n\n" +
    "       import storage\n" +
    '       storage.remount("/", readonly=False)\n\n' +
    "2. Hard-reset the board: press its RESET button, or unplug and replug it. " +
    "Ctrl-D is NOT enough, because a soft reload does not re-run boot.py.\n\n" +
    "The board then owns write access from the moment it boots, so saving over serial works. " +
    "The trade-off is that you can no longer edit files by dragging them onto the CIRCUITPY " +
    "drive; remove those lines and hard-reset again to go back.";

/** Raised when the device filesystem is read-only to CircuitPython (errno 30). */
export class ReadOnlyFilesystemError extends Error {
    constructor(path) {
        super(
            "The board's filesystem is read-only to CircuitPython, so it cannot be written over serial.\n\n" +
                "This is normal: while the CIRCUITPY drive is mounted on your computer, the computer owns " +
                "write access and the board does not.\n\n" +
                "To fix it, open the Navigation tab and use \"Query current state\" under Filesystem Write " +
                "Access, then switch write access to CircuitPython.\n\n---\n\n" +
                BOOT_PY_FALLBACK
        );
        this.name = "ReadOnlyFilesystemError";
        this.errno = 30;
        this.path = path;
    }
}

/** Raised when a device operation failed for a reason we recognise but cannot fix. */
export class DeviceOperationError extends Error {
    constructor(message, errno, path) {
        super(message);
        this.name = "DeviceOperationError";
        this.errno = errno;
        this.path = path;
    }
}

/** Raised when the raw REPL handshake or an exec did not behave as expected. */
export class RawReplError extends Error {
    constructor(message) {
        super(message);
        this.name = "RawReplError";
    }
}

// Some ports render "OSError: [Errno 30] ..." and some only "OSError: 30".
// mpremote hit the same split and scans for both; so do we.
const ERRNO_PATTERNS = [/\[Errno (\d+)\]/, /OSError:\s*(\d+)\s*$/m];

/** Pull the errno out of a device traceback, or null if there isn't one. */
export function parseErrno(traceback) {
    const text = String(traceback || "");
    for (const pattern of ERRNO_PATTERNS) {
        const match = text.match(pattern);
        if (match) {
            return parseInt(match[1], 10);
        }
    }
    return null;
}

const ERRNO_MESSAGES = {
    2: (path) => `Not found on the board: ${path || "(unknown path)"}`,
    17: (path) => `Already exists on the board: ${path || "(unknown path)"}`,
    39: (path) => `Directory is not empty: ${path || "(unknown path)"}`,
};

/**
 * Convert a device traceback into the most specific error we can.
 *
 * @param {string} traceback  stderr text from a raw REPL exec
 * @param {string} [path]     the path the operation was about, for the message
 * @returns {Error}
 */
export function deviceError(traceback, path) {
    const errno = parseErrno(traceback);
    if (errno === 30) {
        return new ReadOnlyFilesystemError(path);
    }
    if (ERRNO_MESSAGES[errno]) {
        return new DeviceOperationError(ERRNO_MESSAGES[errno](path), errno, path);
    }
    // Unrecognised: keep the device's own last line, which is the useful part.
    const lines = String(traceback || "")
        .trim()
        .split("\n");
    const summary = lines[lines.length - 1] || "Unknown device error";
    return new DeviceOperationError(summary.trim(), errno, path);
}
