import RawReplSession from "./rawRepl";
import * as constants from "../constants";

// Marks a line as the IDE's own, not output from the board. Checked against every
// existing parser marker (status-bar OSC, <CV>, the debugger's [S]/[CO]/[CW],
// the plotter) — see src/constants.js — so it cannot be mistaken for one.
const ANNOUNCE_PREFIX = "[IDE]";

/**
 * Run `fn` inside one exclusive raw REPL session on the shared serial port.
 *
 * This is the single place that adapts a SerialCommunication into the three io
 * functions RawReplSession needs, so the file system and the storage-control
 * tool cannot drift apart. They previously each had their own copy, and the
 * copies disagreed about whether to check the port first.
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
    // serialReady is React state and lags a physical disconnect, so check the
    // port itself rather than trusting a flag that may be a render behind.
    if (!serial || !serial.port || !serial.writer) {
        throw new Error("Connect the serial port before talking to the board.");
    }
    const release = await serial.startTransaction();
    // Announced after the transaction is released, so the summary lands in the
    // console once the operation is really over.
    let outcome = null;
    try {
        const session = new RawReplSession({
            write: (data) => serial.writeNow(data),
            readUntil: (match, timeout) => serial.readUntil(match, timeout),
            readExactly: (count, timeout) => serial.readExactly(count, timeout),
            drain: () => serial.drainExclusive(),
        });
        const result = await session.run(fn);
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
