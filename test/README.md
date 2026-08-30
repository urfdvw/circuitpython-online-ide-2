# Tests

```
npm test              # everything
npm test serial       # only files whose name contains "serial"
```

These cover the serial file source (`src/serialFs/`) and the serial transport
changes it depends on. They exist because that code is easy to break in ways that
are invisible without a board attached: protocol timing, cache races, and Python
that is generated as text and only fails once it reaches the device.

## No test framework

`test/run.mjs` bundles each `*.test.js` with `esbuild` (already a Vite
dependency) and runs it under node, so there is nothing extra to install. The
bundling step is what lets a test file use the same extensionless imports as the
app.

A test file prints `PASS <name>` / `FAIL <name>` lines and exits non-zero on
failure. That is the whole contract, so any file is also runnable on its own once
bundled.

## The fake board

`helpers/fakeDevice.py` is a stand-in CircuitPython device. It execs each
injected snippet against one persistent namespace, exactly as a raw REPL session
does, so `f = open(...)` in one exec is still open in the next. `os` and `open`
are redirected into a temporary sandbox, so `/code.py` means the sandbox root and
a test can never touch the real disk.

This is deliberately not a mock of our own code: the injected Python really runs,
so a snippet with a syntax error or wrong semantics fails here rather than on a
board.

Files marked `// @requires python3` are skipped, not failed, when `python3` is
missing.

## What each file is for

| File | Covers |
| --- | --- |
| `fileSystem.test.js` | The duck-typed handles, driven through the **real** `fileSystemUtils` helpers that FolderView, the editor and Backup use. Also asserts that repeated listings cost zero device round trips. |
| `deviceOps.test.js` | The injected Python against the fake board: create must not truncate, writes restart the board and reads do not, filenames with edge whitespace survive, a deleted directory reads as unhealthy, a failed write cleans up its temp file. |
| `pythonRepr.test.js` | Quoting and byte encoding, cross-checked against a real `python3`. Both device-side decoders (`binascii` and the pure-Python fallback) must agree with what JavaScript produced, and every injected snippet must compile. |
| `serialTransaction.test.js` | Exclusive access to the shared port: console traffic is held rather than dropped during a transfer, reads time out per byte but not forever, transactions serialise, closing the port strands nothing. |
| `fsCache.test.js` | Refresh cannot cancel a walk already on the wire, so a stale walk must not publish over a newer one and a write landing mid-walk must not be lost. |
| `storageControl.test.js` | The manual write-access tool, including that `usb_connected` is not used to decide who owns the filesystem. |
| `saveReporting.test.js` | A failed write is reported rather than silently treated as a save. |
| `announce.test.js` | Console summaries for serial file operations: they reach both the console and the agent's buffer, survive the exclusive tap, keep a failure to one line, and — the reason this exists — make `sendCode`'s readiness check fail rather than pass on stale output after a write. |
| `agentBridge.test.js` | Every `fileSystemUtils` function the agent bridge imports, driven on serial handles, plus the `window.__cpyAgent` surface itself: the bridge-on gate, `status().fileSource`, and `refreshFiles()` actually reaching the file source. |

## Adding a test

```js
// @requires python3          <- only if you use startFakeDevice
import { harness } from "./helpers/harness.js";
import { startFakeDevice } from "./helpers/fakeDevice.js";

const t = harness("what this file is about");
t.watch();                    // fails loudly instead of hanging

const device = startFakeDevice({ "code.py": "print(1)\n" });
try {
    t.check("some behaviour", actual === expected, `got ${actual}`);
} catch (error) {
    t.fail("unexpected error", error);
} finally {
    device.stop();            // kills python3 and removes the sandbox
}

t.done();                     // prints results and exits
```

`t.done()` exits the process explicitly, which matters because some tests start
loops (`SerialCommunication.writeLoop`) that never settle on their own.

## What is not covered

The UI is not tested here. Browser-level checks were done ad hoc over the Chrome
DevTools Protocol against `npm run dev`; anything involving React state, the
FlexLayout model, or the settings form still needs a real browser. In particular
`useFileSourceTabs` (closing editor tabs when the file source changes) is only
verified structurally.
