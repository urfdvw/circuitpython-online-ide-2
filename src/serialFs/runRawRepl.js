import RawReplSession from "./rawRepl";

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
 *   leaves it running the new code instead of parked at the REPL
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
    try {
        const session = new RawReplSession({
            write: (data) => serial.writeNow(data),
            readUntil: (match, timeout) => serial.readUntil(match, timeout),
            readExactly: (count, timeout) => serial.readExactly(count, timeout),
            drain: () => serial.drainExclusive(),
        });
        return await session.run(fn, { restart: opts.restart });
    } finally {
        release();
    }
}
