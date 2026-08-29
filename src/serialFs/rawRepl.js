// The raw REPL protocol, as spoken by both CircuitPython and MicroPython.
//
// Deliberately transport-agnostic: this module only ever calls the three io
// functions handed to it, so the same code works over Web Serial today and over
// BLE later. That is not an abstraction for its own sake, it is just that the
// protocol genuinely does not care where the bytes come from.
//
// We implement plain raw REPL only, no raw-paste mode. CircuitPython does support
// raw-paste since 7.0, but it is broken on ESP32-C3/C6/H2 USB-serial-JTAG
// (adafruit/circuitpython#8658), and ViperIDE reaches the same conclusion. Plain
// raw REPL is fast enough for editor-sized files and works everywhere.

import * as constants from "../constants";
import { deviceError, RawReplError } from "./errors";

const CTRL_A = "\x01";
const CTRL_B = "\x02";
const CTRL_C = "\x03";
const CTRL_D = "\x04";

const RAW_REPL_BANNER = "raw REPL; CTRL-B to exit\r\n";
// CircuitPython prints this when code.py finishes and then waits. It has no
// MicroPython equivalent, and it shows up on every reconnect. Unhandled, the
// handshake just hangs.
const PRE_PROMPT = "Press any key to enter the REPL.";
const NORMAL_PROMPT = ">>> ";

// ViperIDE uses 128 and no inter-chunk delay; pyboard.py uses 256 with 10ms.
// 128 is the safe floor across the boards we care about.
const WRITE_CHUNK = 128;

/**
 * Strip CircuitPython's status-bar OSC sequences (`\x1b]0;...\x1b\\`).
 *
 * The supervisor writes these into the serial stream (status_bar.c). They are
 * suspended around pyexec_raw_repl(), so they mostly appear during the handshake
 * rather than mid-transfer, but they will corrupt a read if left in.
 */
const escapeForRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Derived from the constants rather than written out again, so the markers stay
// defined in exactly one place.
const STATUS_BAR_RE = new RegExp(
    `${escapeForRegex(constants.TITLE_START)}[\\s\\S]*?${escapeForRegex(constants.TITLE_END)}`,
    "g"
);

export function stripStatusBar(text) {
    if (!text || !text.includes(constants.TITLE_START)) {
        return text;
    }
    // Drop complete sequences, then any trailing partial one.
    return text.split(STATUS_BAR_RE).join("").split(constants.TITLE_START)[0];
}

/**
 * A raw REPL conversation with one device.
 *
 * @param {object} io
 * @param {(data: string) => Promise<void>} io.write        send raw characters
 * @param {(match: string, timeout?: number) => Promise<string>} io.readUntil
 *        read until `match` appears; resolves with everything read INCLUDING the
 *        match. Must restart its timeout on every received byte.
 * @param {(n: number, timeout?: number) => Promise<string>} io.readExactly
 * @param {() => void} [io.drain]  discard anything buffered
 */
export default class RawReplSession {
    constructor(io) {
        this.io = io;
        this.inRawRepl = false;
    }

    /** Ctrl-C: break out of a running program, and past CircuitPython's pre-prompt. */
    async interrupt() {
        await this.io.write(CTRL_C);
        if (this.io.drain) {
            this.io.drain();
        }
    }

    /**
     * Enter raw REPL, retrying until `timeout` expires.
     *
     * The retry loop is the important part. A single Ctrl-C + Ctrl-A is not
     * reliable when the board is mid-print, mid-boot, or sitting at the
     * "Press any key" prompt, so we keep trying rather than failing once.
     */
    async enterRawRepl(timeout = 20000) {
        const deadline = Date.now() + timeout;
        let lastSeen = "";
        for (;;) {
            try {
                await this.interrupt();
                await this.io.write("\r" + CTRL_A);
                await this.io.readUntil(RAW_REPL_BANNER, 2000);
                this.inRawRepl = true;
                return;
            } catch (err) {
                lastSeen = String(err?.seen || lastSeen);
                if (Date.now() >= deadline) {
                    const hint = lastSeen.includes(PRE_PROMPT)
                        ? " The board is at the \"Press any key to enter the REPL\" prompt and did not respond to Ctrl-C."
                        : "";
                    throw new RawReplError("The board is not responding to the raw REPL handshake." + hint);
                }
            }
        }
    }

    /**
     * Run one statement block and return its stdout.
     *
     * Protocol: wait for `>`, send the command, send Ctrl-D, expect `OK`, then
     * stdout up to \x04, then stderr up to \x04.
     */
    async exec(cmd, timeout = 15000, path) {
        if (!this.inRawRepl) {
            throw new RawReplError("exec() called outside raw REPL");
        }
        await this.io.readUntil(">", timeout);

        for (let i = 0; i < cmd.length; i += WRITE_CHUNK) {
            await this.io.write(cmd.slice(i, i + WRITE_CHUNK));
        }
        await this.io.write(CTRL_D);

        const status = await this.io.readExactly(2, timeout);
        if (status !== "OK") {
            throw new RawReplError(`The board rejected a command (got ${JSON.stringify(status)} instead of OK)`);
        }

        const stdout = stripStatusBar((await this.io.readUntil(CTRL_D, timeout)).slice(0, -1));
        const stderr = stripStatusBar((await this.io.readUntil(CTRL_D, timeout)).slice(0, -1));

        if (stderr.trim()) {
            throw deviceError(stderr, path);
        }
        return stdout;
    }

    /** Ctrl-B: back to the friendly REPL, so the console tab behaves normally again. */
    async exitRawRepl() {
        if (!this.inRawRepl) {
            return;
        }
        this.inRawRepl = false;
        try {
            await this.io.write("\r" + CTRL_B);
            await this.io.readUntil(NORMAL_PROMPT, 2000);
        } catch {
            // Leaving raw mode is best-effort. If the board went away mid-session,
            // failing here would mask the real error from the caller's operation.
        }
    }

    /**
     * Enter raw REPL, run `fn`, and always leave raw REPL again.
     *
     * @param {(session: RawReplSession) => Promise<T>} fn
     * @returns {Promise<T>}
     * @template T
     */
    async run(fn, timeout) {
        await this.enterRawRepl(timeout);
        try {
            return await fn(this);
        } finally {
            await this.exitRawRepl();
        }
    }
}
