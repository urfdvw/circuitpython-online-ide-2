// Drives test/helpers/fakeDevice.py and exposes it as a RawReplSession-shaped
// `session`, so tests exercise the real injected Python end to end.

import { spawn } from "node:child_process";
import * as readline from "node:readline";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";

import { deviceError } from "../../src/serialFs/errors.js";

// The runner bundles this file into a temp dir, so import.meta.url no longer
// points at test/helpers. It passes the real location through the environment.
const DEVICE_SCRIPT = process.env.FAKE_DEVICE_SCRIPT;

/**
 * Start a fake board.
 *
 * @param {Record<string, string>} [files] initial contents, keyed by device path
 * @returns {{session, root: string, execCount: () => number, resetExecCount: () => void,
 *            failNextExecAt: (n: number|null, message?: string) => void,
 *            listRoot: () => string[], stop: () => void}}
 */
export function startFakeDevice(files = {}) {
    const root = mkdtempSync(join(tmpdir(), "cpy-ide-test-"));
    for (const [path, contents] of Object.entries(files)) {
        const full = join(root, path.replace(/^\//, ""));
        mkdirSync(dirname(full), { recursive: true });
        writeFileSync(full, contents);
    }

    if (!DEVICE_SCRIPT) {
        throw new Error("FAKE_DEVICE_SCRIPT is not set; run these tests through `npm test`.");
    }
    const py = spawn("python3", [DEVICE_SCRIPT], {
        env: { ...process.env, FAKE_DEVICE_ROOT: root },
        stdio: ["pipe", "pipe", "inherit"],
    });
    const lines = readline.createInterface({ input: py.stdout });
    const pending = [];
    lines.on("line", (line) => pending.shift()?.(JSON.parse(line)));

    let execs = 0;
    let failAt = null;
    let failMessage = "OSError: [Errno 28] No space left on device";

    const session = {
        exec: (code, _timeout, path) =>
            new Promise((resolve, reject) => {
                execs += 1;
                if (failAt !== null && execs === failAt) {
                    reject(deviceError(failMessage, path));
                    return;
                }
                pending.push((reply) => (reply.err ? reject(deviceError(reply.err, path)) : resolve(reply.out)));
                py.stdin.write(JSON.stringify({ code }) + "\n");
            }),
    };

    return {
        session,
        root,
        execCount: () => execs,
        resetExecCount: () => {
            execs = 0;
        },
        /** Make the nth exec of this session fail, to test cleanup paths. */
        failNextExecAt(n, message) {
            failAt = n;
            if (message) failMessage = message;
        },
        /** Read the sandbox directly, to check what really landed on the board. */
        listRoot: () => readdirSync(root).sort(),
        stop() {
            try {
                py.stdin.end();
                py.kill();
            } catch {
                // already gone
            }
            rmSync(root, { recursive: true, force: true });
        },
    };
}
