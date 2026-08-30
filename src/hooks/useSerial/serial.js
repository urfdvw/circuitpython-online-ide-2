// A read's absolute cap, as a multiple of its idle timeout. Generous, because
// the idle timeout is what should normally fire; this only exists so a board
// that never stops talking cannot wedge a transaction forever.
const ABSOLUTE_TIMEOUT_FACTOR = 10;
const MIN_ABSOLUTE_TIMEOUT = 30000;

export default class SerialCommunication {
    constructor() {
        this.port = null;
        this.reader = null;
        this.writer = null;
        this.keepRunning = true;
        this.writeBuffer = [];
        this.readerCallbacks = {};
        // baud rate of the current/last connection; reused on automatic reconnect
        this._baudRate = 115200;

        // reconnect support
        this._listening = false;
        this._lastPortInfo = null;
        this._reconnecting = false;

        // Exclusive-access support, used by the serial file system.
        // While a transaction is held, readLoop routes bytes into _exclusive
        // instead of broadcasting them, so a file transfer's hex payloads never
        // reach the console UI. See src/serialFs/.
        this._txTail = Promise.resolve();
        this._exclusive = null;
        // True only while writeLoop is awaiting an actual port write, so a
        // starting transaction can wait for that write to land.
        this._writing = false;
    }

    async open(portOptions, baudRate = 115200) {
        console.log("trying to open serial communication");
        this._baudRate = baudRate;
        if ("serial" in navigator) {
            try {
                this.port = await navigator.serial.requestPort(portOptions);
            } catch (error) {
                console.error("Error requesting serial port:", error);
                return false;
            }
            try {
                // store info for possible reconnects
                try {
                    this._lastPortInfo = this.port.getInfo ? this.port.getInfo() : null;
                } catch (e) {
                    this._lastPortInfo = null;
                }

                // Install global listeners once
                if (!this._listening) {
                    this._listening = true;
                    navigator.serial.addEventListener(
                        "disconnect",
                        this._onDisconnect.bind(this)
                    );
                    navigator.serial.addEventListener(
                        "connect",
                        this._onConnect.bind(this)
                    );
                }

                await this.port.open({ baudRate: this._baudRate });

                this.reader = this.port.readable.getReader();
                this.writer = this.port.writable.getWriter();

                this.readLoop();
                this.writeLoop();

                console.log("successfully opened serial communication");

                for (const id in this.readerCallbacks) {
                    this.readerCallbacks[id](`

================ Serial connected ================


`);
                }
                return true;
            } catch (error) {
                console.error("Error opening serial port:", error);
            }
        } else {
            console.error("Web Serial API not supported.");
        }
        return false;
    }

    async close() {
        console.log("trying to close serial communication");
        this.keepRunning = false;
        this.writeBuffer = [];

        // Tear down any transaction the closing port was in the middle of.
        // Left set, _exclusive would survive an auto-reconnect and readLoop would
        // keep routing every byte into a dead transaction's buffer, so the
        // console would stay silent until the orphaned read finally timed out.
        if (this._exclusive) {
            const stranded = this._exclusive;
            this._exclusive = null;
            // Fail whoever is blocked on a read now, rather than making them wait
            // out a timeout against a port that is already gone.
            if (stranded.abort) {
                stranded.abort();
            }
        }
        this._writing = false;

        // preserve last port info so we can attempt reconnect later
        if (this.port && this.port.getInfo) {
            try {
                this._lastPortInfo = this.port.getInfo();
            } catch (e) {
                // ignore
            }
        }

        if (this.reader) {
            try {
                await this.reader.cancel();
                await this.reader.releaseLock();
            } catch (err) {
                console.error("Failed to close reader:", err);
            }
            this.reader = null;
        }

        if (this.writer) {
            try {
                await this.writer.releaseLock();
            } catch (err) {
                console.error("Failed to close writer:", err);
            }
            this.writer = null;
        }

        if (this.port) {
            try {
                await this.port.close();
            } catch (err) {
                console.error("Failed to close port:", err);
            }
            this.port = null;
        }

        for (const id in this.readerCallbacks) {
            this.readerCallbacks[id](`

================ Serial disconnected ================


`);
        }
        console.log("closed serial communication");
    }

    registerReaderCallback(id, callback) {
        this.readerCallbacks[id] = callback;
    }

    unregisterReaderCallback(id) {
        delete this.readerCallbacks[id];
    }

    write(data) {
        this.writeBuffer.push(data);
    }

    async readLoop() {
        this.keepRunning = true;
        const decoder = new TextDecoder();
        while (this.port && this.port.readable && this.keepRunning) {
            try {
                const { value, done } = await this.reader.read();
                if (done || !this.keepRunning) {
                    break;
                }
                const decoded = decoder.decode(value);
                if (this._exclusive) {
                    this._exclusive.buffer += decoded;
                    if (this._exclusive.notify) {
                        this._exclusive.notify();
                    }
                    continue;
                }
                for (const id in this.readerCallbacks) {
                    this.readerCallbacks[id](decoded);
                }
            } catch (error) {
                console.error("Error reading from serial port:", error);
                this.close();
            }
        }
    }

    async writeLoop() {
        const encoder = new TextEncoder();
        while (this.port && this.port.writable && this.keepRunning) {
            // Hold everything back while a transaction owns the port. Console
            // keystrokes, Ctrl-C from the stop button, the debugger and the agent
            // bridge all push here, and letting any of them through mid-transfer
            // would inject bytes straight into the raw REPL command stream: at
            // best the transfer fails, at worst the injected text is written into
            // the file on the board.
            //
            // They queue rather than being dropped, so they replay on release.
            // A Ctrl-C pressed during a transfer therefore lands after it, which
            // is worth it to keep the transfer intact.
            if (!this._exclusive && this.writeBuffer.length > 0) {
                while (this.writeBuffer.length > 0 && !this._exclusive) {
                    const data = this.writeBuffer.shift();

                    this._writing = true;
                    try {
                        await this.writer.write(encoder.encode(data));
                    } catch (error) {
                        console.error("Error writing to serial port:", error);
                        this.keepRunning = false;
                    } finally {
                        this._writing = false;
                    }
                }
                // NOTE: deliberately no `this.writeBuffer = []` here. The loop
                // above already drained it, so that assignment only ever threw
                // away entries pushed while it was running.
            }
            await new Promise((resolve) => setTimeout(resolve, 1)); // Small delay to prevent high CPU usage
        }
    }

    // ===================== exclusive access =====================
    // The REPL console already owns this port and a USB CDC console endpoint
    // cannot be opened twice, so the file system has to borrow this same
    // connection rather than open its own.

    /**
     * Take exclusive use of the port. Resolves once any earlier transaction has
     * finished; call the returned function to release.
     *
     * @returns {Promise<() => void>} release
     */
    async startTransaction() {
        let release;
        const finished = new Promise((resolve) => {
            release = resolve;
        });
        const previous = this._txTail;
        this._txTail = previous.then(() => finished);
        await previous;

        // Claim the port first so writeLoop stops taking new entries...
        this._exclusive = { buffer: "", notify: null, abort: null };

        // ...then wait out the one write that may already be in flight. Without
        // this, a chunk that writeLoop was mid-`await` on would still land inside
        // our command stream. Bounded so a wedged port cannot hang the caller.
        const deadline = Date.now() + 1000;
        while (this._writing && Date.now() < deadline) {
            await new Promise((resolve) => setTimeout(resolve, 1));
        }

        // Anything queued before we claimed the port is console traffic that
        // belongs to the previous prompt; it would be misread as our own output.
        this.drainExclusive();
        let released = false;
        return () => {
            if (released) {
                return;
            }
            released = true;
            this._exclusive = null;
            release();
        };
    }

    /** Write immediately rather than via writeLoop, which polls every 1ms. */
    async writeNow(data) {
        if (!this.writer) {
            throw new Error("Serial port is not open");
        }
        await this.writer.write(new TextEncoder().encode(data));
    }

    /** Discard anything buffered for the current transaction. */
    drainExclusive() {
        if (this._exclusive) {
            this._exclusive.buffer = "";
        }
    }

    /**
     * Broadcast an IDE-generated line to every listener.
     *
     * Deliberately bypasses the exclusive tap: this is the IDE talking, not
     * device bytes, so it belongs in the console even while a transaction holds
     * the port. Going through readerCallbacks (rather than a channel's
     * addToOutput) is what keeps the console and the agent's buffer in step,
     * since both are fed from here.
     */
    announce(text) {
        const line = `\n${text}\n`;
        for (const id in this.readerCallbacks) {
            this.readerCallbacks[id](line);
        }
    }

    /**
     * Core of readUntil/readExactly.
     *
     * The idle timeout restarts on every byte received, so a board that is slow
     * but still talking is never cut off. ViperIDE does the same; a fixed
     * deadline would spuriously fail large transfers.
     *
     * On top of that there is an absolute deadline, because the per-byte restart
     * alone is not an upper bound: a board printing in a loop that Ctrl-C does
     * not stop would re-arm the idle timer forever, the read would never reject,
     * and the transaction would never be released. Since startTransaction chains
     * on _txTail, that would wedge every later file operation behind a promise
     * that can never settle.
     */
    _readMatching(matcher, timeout, description) {
        return new Promise((resolve, reject) => {
            const exclusive = this._exclusive;
            if (!exclusive) {
                reject(new Error("Serial read attempted outside a transaction"));
                return;
            }
            let timer = null;
            let hardTimer = null;
            const settle = () => {
                clearTimeout(timer);
                clearTimeout(hardTimer);
                exclusive.notify = null;
                exclusive.abort = null;
            };
            // Lets close() fail this read immediately when the port goes away.
            exclusive.abort = () => {
                settle();
                reject(new Error("Serial port closed while waiting for the board"));
            };
            hardTimer = setTimeout(
                () => {
                    settle();
                    const error = new Error(
                        `The board kept sending data without producing ${description}; giving up.`
                    );
                    error.seen = exclusive.buffer;
                    reject(error);
                },
                Math.max(timeout * ABSOLUTE_TIMEOUT_FACTOR, MIN_ABSOLUTE_TIMEOUT)
            );
            const tryMatch = () => {
                const cut = matcher(exclusive.buffer);
                if (cut < 0) {
                    return false;
                }
                settle();
                const taken = exclusive.buffer.slice(0, cut);
                exclusive.buffer = exclusive.buffer.slice(cut);
                resolve(taken);
                return true;
            };
            const armTimeout = () => {
                clearTimeout(timer);
                timer = setTimeout(() => {
                    settle();
                    const error = new Error(`Timed out waiting for ${description} from the board`);
                    // rawRepl uses this to tell a wedged board from a silent one.
                    error.seen = exclusive.buffer;
                    reject(error);
                }, timeout);
            };
            exclusive.notify = () => {
                if (!tryMatch()) {
                    armTimeout();
                }
            };
            if (!tryMatch()) {
                armTimeout();
            }
        });
    }

    /** Read until `match` appears; resolves with everything read, including it. */
    readUntil(match, timeout = 5000) {
        return this._readMatching(
            (buffer) => {
                const index = buffer.indexOf(match);
                return index < 0 ? -1 : index + match.length;
            },
            timeout,
            JSON.stringify(match)
        );
    }

    /** Read exactly `count` characters. */
    readExactly(count, timeout = 5000) {
        return this._readMatching((buffer) => (buffer.length >= count ? count : -1), timeout, `${count} characters`);
    }

    // Handle the physical disconnect event.
    _onDisconnect(event) {
        try {
            if (event && event.port && event.port.getInfo) {
                this._lastPortInfo = event.port.getInfo();
            } else if (this.port && this.port.getInfo) {
                this._lastPortInfo = this.port.getInfo();
            }
        } catch (e) {
            // ignore
        }
        console.warn("====== serial port disconnected (physical)");
        // Close current connection but keep _lastPortInfo for reconnect attempts
        this.close();
    }

    // Handle the physical connect event and try to re-open the previously used port.
    async _onConnect() {
        // only attempt reconnect if we have info about the last port and we're not already connected/reconnecting
        if (!this._lastPortInfo || this.port || this._reconnecting) {
            return;
        }

        this._reconnecting = true;
        try {
            const ports = await navigator.serial.getPorts();
            for (const p of ports) {
                try {
                    const info = p.getInfo ? p.getInfo() : {};
                    // match using usbVendorId and usbProductId if available
                    const last = this._lastPortInfo || {};
                    if (
                        (last.usbVendorId == null || info.usbVendorId === last.usbVendorId) &&
                        (last.usbProductId == null || info.usbProductId === last.usbProductId)
                    ) {
                        // attempt to re-open the port at the same baud rate as before
                        try {
                            await p.open({ baudRate: this._baudRate });
                        } catch (openErr) {
                            console.warn("Reopen failed:", openErr);
                            continue;
                        }
                        this.port = p;
                        try {
                            this.reader = this.port.readable.getReader();
                            this.writer = this.port.writable.getWriter();
                        } catch (attachErr) {
                            console.error("Failed to attach reader/writer on reconnect:", attachErr);
                        }

                        // restart loops
                        this.keepRunning = true;
                        this.readLoop();
                        this.writeLoop();

                        // notify callbacks about reconnect
                        for (const id in this.readerCallbacks) {
                            this.readerCallbacks[id](`

================ Serial reconnected ================


`);
                        }
                        break; // stop searching after successful reconnect
                    }
                } catch (inner) {
                    // skip problematic port
                    continue;
                }
            }
        } catch (err) {
            console.error("Error while attempting reconnect:", err);
        } finally {
            this._reconnecting = false;
        }
    }
}
