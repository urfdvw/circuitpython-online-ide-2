// Minimal assertion harness.
//
// No test framework on purpose: esbuild is already a Vite dependency, so the
// runner can bundle a test file and hand it to node with nothing new installed.
// The contract with test/run.mjs is just the output format below plus the exit
// code, so a test file is also runnable on its own.

/**
 * @param {string} title  shown once above this file's results
 */
export function harness(title) {
    const results = [];
    let watchdog = null;

    const api = {
        /**
         * @param {string} name    what is being asserted
         * @param {boolean} passed
         * @param {string} [detail] shown next to the result, useful on failure
         */
        check(name, passed, detail = "") {
            results.push({ name, passed: Boolean(passed), detail: String(detail) });
        },

        /** Fail with the error rather than crashing the whole run. */
        fail(name, error) {
            results.push({ name, passed: false, detail: String(error?.message || error) });
        },

        /**
         * Guard against a hang. Several of these tests drive real timers and
         * promise chains, and a deadlock would otherwise stall the whole run.
         */
        watch(ms = 20000) {
            watchdog = setTimeout(() => {
                api.check("test file finished", false, `timed out after ${ms}ms`);
                api.done();
            }, ms);
            // Do not let the watchdog itself hold the process open.
            if (watchdog.unref) watchdog.unref();
        },

        /**
         * Print results and exit.
         *
         * The explicit exit matters: some tests start loops (SerialCommunication's
         * writeLoop) that never settle on their own.
         */
        done() {
            if (watchdog) clearTimeout(watchdog);
            console.log(`# ${title}`);
            for (const r of results) {
                console.log(`${r.passed ? "PASS" : "FAIL"}  ${r.name}${r.detail ? "  " + r.detail : ""}`);
            }
            process.exit(results.some((r) => !r.passed) ? 1 : 0);
        },
    };
    return api;
}
