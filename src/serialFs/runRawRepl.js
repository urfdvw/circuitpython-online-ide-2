import RawReplSession from "./rawRepl";
import * as constants from "../constants";

// Marks a line as the IDE's own, not output from the board. Checked against every
// existing parser marker (status-bar OSC, <CV>, the debugger's [S]/[CO]/[CW],
// the plotter) — see src/constants.js — so it cannot be mistaken for one.
const ANNOUNCE_PREFIX = "[IDE]";

/**
 * The raw REPL session currently open on a port, if any.
 *
 * Keyed by the SerialCommunication instance rather than held in a single module
 * variable, so the REPL channel and the Connected Variables data channel cannot
 * be mistaken for one another.
 *
 * @type {WeakMap<object, {session: RawReplSession, restartWanted: boolean}>}
 */
const activeSessions = new WeakMap();

function assertUsable(serial) {
    // serialReady is React state and lags a physical disconnect, so check the
    // port itself rather than trusting a flag that may be a render behind.
    if (!serial || !serial.port || !serial.writer) {
        throw new Error("Connect the serial port before talking to the board.");
    }
}

function makeSession(serial) {
    return new RawReplSession({
        write: (data) => serial.writeNow(data),
        readUntil: (match, timeout) => serial.readUntil(match, timeout),
        readExactly: (count, timeout) => serial.readExactly(count, timeout),
        drain: () => serial.drainExclusive(),
    });
}

/**
 * Hold ONE raw REPL session open across many file operations.
 *
 * Without this, every file read or write pays its own Ctrl-C, handshake and
 * Ctrl-B. Scanning twenty installed libraries meant twenty separate
 * interruptions of whatever the board was running. Inside this wrapper they
 * share a single session, so the board is interrupted once.
 *
 * Nesting is the point: `runRawRepl` finds the open session and reuses it, so
 * the generic file helpers (which know nothing about serial) need no changes.
 *
 * @param {object} serial
 * @param {() => Promise<T>} fn  the batch; anything it calls reuses this session
 * @param {object} [opts]
 * @param {string} [opts.label]  one summary for the whole batch
 * @returns {Promise<T>}
 * @template T
 */
export async function withSerialSession(serial, fn, opts = {}) {
    const existing = activeSessions.get(serial);
    if (existing) {
        // Already inside a batch: just run, and let the outermost one finish up.
        return await fn();
    }

    assertUsable(serial);
    const release = await serial.startTransaction();
    const entry = { session: makeSession(serial), restartWanted: false };
    activeSessions.set(serial, entry);

    let outcome = null;
    try {
        await entry.session.enterRawRepl();
        const result = await fn();
        outcome = opts.label ? `${ANNOUNCE_PREFIX} ${opts.label}` : null;
        return result;
    } catch (error) {
        const reason = String(error?.message || error).split("\n")[0];
        outcome = opts.label ? `${ANNOUNCE_PREFIX} ${opts.label} failed: ${reason}` : null;
        throw error;
    } finally {
        activeSessions.delete(serial);
        await entry.session.exitRawRepl();
        release();
        if (outcome) {
            serial.announce(outcome);
        }
        // One reboot for the whole batch, however many writes it contained.
        // Rebooting per write would restart the board twenty times over.
        if (entry.restartWanted) {
            serial.write(constants.CTRL_D);
        }
    }
}

/**
 * Run `fn` inside a raw REPL session on the shared serial port.
 *
 * This is the single place that adapts a SerialCommunication into the three io
 * functions RawReplSession needs, so the file system and the storage-control
 * tool cannot drift apart. They previously each had their own copy, and the
 * copies disagreed about whether to check the port first.
 *
 * If a batch is already open on this port (see withSerialSession), the existing
 * session is reused: no second transaction, no second handshake. In that case
 * `label` is dropped, because the batch announces itself once, and `restart` is
 * remembered and applied when the batch ends.
 *
 * @param {object} serial   the shared SerialCommunication instance
 * @param {(session: RawReplSession) => Promise<T>} fn
 * @param {object} [opts]
 * @param {boolean} [opts.restart]  soft-reboot the board afterwards, so a write
 *   leaves it running the new code instead of parked at the REPL. Sent after the
 *   transaction is released and from the friendly prompt, for the reasons in
 *   RawReplSession.exitRawRepl().
 * @param {string} [opts.label]  short summary to announce in the console when
 *   the operation finishes, e.g. "wrote code.py"
 * @returns {Promise<T>}
 * @template T
 */
export default async function runRawRepl(serial, fn, opts = {}) {
    const existing = activeSessions.get(serial);
    if (existing) {
        if (opts.restart) {
            existing.restartWanted = true;
        }
        return await fn(existing.session);
    }

    assertUsable(serial);
    const release = await serial.startTransaction();
    // Announced after the transaction is released, so the summary lands in the
    // console once the operation is really over.
    let outcome = null;
    try {
        const result = await makeSession(serial).run(fn);
        outcome = opts.label ? `${ANNOUNCE_PREFIX} ${opts.label}` : null;
        return result;
    } catch (error) {
        // First line only: an errno-30 message carries the whole boot.py
        // fallback, which would bury the console.
        const reason = String(error?.message || error).split("\n")[0];
        outcome = opts.label ? `${ANNOUNCE_PREFIX} ${opts.label} failed: ${reason}` : null;
        throw error;
    } finally {
        release();
        if (outcome) {
            serial.announce(outcome);
        }
        if (opts.restart) {
            // Outside the transaction and from `>>>`, so this actually reboots
            // into code.py, and the reboot banner plus the program's own output
            // reach the console instead of being swallowed. Buffered write on
            // purpose: it queues behind anything the console already had.
            serial.write(constants.CTRL_D);
        }
    }
}

/** Turn a device path into something worth showing: "/lib/foo.py" -> "lib/foo.py". */
export function displayPath(path) {
    return String(path || "").replace(/^\/+/, "") || "/";
}
