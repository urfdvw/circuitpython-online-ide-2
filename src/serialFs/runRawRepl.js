import RawReplSession from "./rawRepl";
import * as constants from "../constants";
import { captureConnection } from "./connection";

const ANNOUNCE_PREFIX = "[IDE]";

function makeSession(serial, assertCurrent) {
    const checked = (fn) => (...args) => {
        assertCurrent();
        return fn(...args);
    };
    return new RawReplSession({
        write: checked((data) => serial.writeNow(data)),
        readUntil: checked((match, timeout) => serial.readUntil(match, timeout)),
        readExactly: checked((count, timeout) => serial.readExactly(count, timeout)),
        drain: checked(() => serial.drainExclusive()),
    });
}

/**
 * Hold one transaction across a batch. The callback receives a scoped `run`
 * function; only operations explicitly using it share this session. Other
 * callers always enter the port's transaction queue, including during handshake.
 */
export async function withSerialSession(serial, fn, opts = {}) {
    const connection = captureConnection(serial);
    const release = await serial.startTransaction();
    const session = makeSession(serial, connection.assertCurrent);
    let active = true;
    let restartWanted = false;
    let tail = Promise.resolve();
    let outcome = null;
    // Serialize entire operations, not individual execs: a write keeps Python
    // globals and an open temp file across several commands.
    const run = (operation, operationOpts = {}) => {
        if (!active) return Promise.reject(new Error("This file batch has ended. Reopen the file to use it again."));
        const result = tail.then(async () => {
            connection.assertCurrent();
            if (operationOpts.restart) restartWanted = true;
            return operation(session);
        });
        tail = result.catch(() => {});
        return result;
    };
    try {
        connection.assertCurrent();
        await session.enterRawRepl();
        const result = await fn(run);
        outcome = opts.label ? `${ANNOUNCE_PREFIX} ${opts.label}` : null;
        return result;
    } catch (error) {
        const reason = String(error?.message || error).split("\n")[0];
        outcome = opts.label ? `${ANNOUNCE_PREFIX} ${opts.label} failed: ${reason}` : null;
        throw error;
    } finally {
        active = false;
        await tail;
        await session.exitRawRepl();
        release();
        if (outcome) serial.announce(outcome);
        if (restartWanted && connection.isCurrent()) serial.write(constants.CTRL_D);
    }
}

/** Run an independent operation, waiting for any current batch to finish. */
export default async function runRawRepl(serial, fn, opts = {}) {
    return withSerialSession(serial, (run) => run(fn, opts), opts);
}

/** Turn a device path into something worth showing: "/lib/foo.py" -> "lib/foo.py". */
export function displayPath(path) {
    return String(path || "").replace(/^\/+/, "") || "/";
}
