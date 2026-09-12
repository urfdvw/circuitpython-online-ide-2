# Tests

```
npm test              # everything
npm test serial       # only files whose name contains "serial"
```

These cover serial transfers, file safety, settings persistence, proxy request
validation, and service-worker behavior. The fake board executes generated Python
to expose protocol and filesystem failures without attached hardware.

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
| `fileSafety.test.js` | Failed writes and copies, overlapping backup folders, hidden-file preservation, dotted directories, and pure reads. |
| `serialWriteRecovery.test.js` | Failed replacement and rollback preserve original bytes; staging and recovery files do not overwrite existing entries; invalid child names are rejected. |
| `serialCode.test.js` | Multiline Python and split UTF-8 packets, disconnect isolation, cross-connection handle identity, and malformed hex transfers. |
| `config.test.js` | Malformed storage, schema defaults, successive updates, and storage-quota failures. |
| `proxy.test.js` | Allowed release URLs, redirect restrictions, request methods, and bounded redirect chains. |
| `serviceWorker.test.js` | Cache ownership, offline shell fallback, and cache failures that must not discard successful network responses. |
| `fileSystem.test.js` | The duck-typed handles, driven through the **real** `fileSystemUtils` helpers that FolderView, the editor and Backup use. Also asserts that repeated listings cost zero device round trips. |
| `deviceOps.test.js` | The injected Python against the fake board: create must not truncate, writes restart the board and reads do not, filenames with edge whitespace survive, a deleted directory reads as unhealthy, a failed write cleans up its temp file. |
| `pythonRepr.test.js` | Quoting and byte encoding, cross-checked against a real `python3`. Both device-side decoders (`binascii` and the pure-Python fallback) must agree with what JavaScript produced, and every injected snippet must compile. |
| `serialTransaction.test.js` | Exclusive access to the shared port: console traffic is held rather than dropped during a transfer, reads time out per byte but not forever, transactions serialise, closing the port strands nothing. |
| `batchSession.test.js` | Independent callers queue during a batch, scoped operations serialize, and reconnecting cannot redirect queued work or cleanup to another board. |
| `serialFileBatch.test.js` | Multiple writes through the raw REPL and Python fake board share one session and one reboot, preserve file contents, and finish even with an outside cache read waiting. |
| `serialConnection.test.js` | Existing file handles and writable streams reject access after a disconnect or replacement connection. |
| `fileSourceLifecycle.test.js` | Repeated renders preserve the callback used by Backup's schedule effects; reconnecting replaces the root handle. Uses an isolated hook dispatcher rather than a browser. |
| `browserSupport.test.js` | Browser and version support rules, plus unsupported-browser guidance. |
| `fsCache.test.js` | Refresh cannot cancel a walk already on the wire, so a stale walk must not publish over a newer one and a write landing mid-walk must not be lost. |
| `storageControl.test.js` | The manual write-access tool, including that `usb_connected` is not used to decide who owns the filesystem. |
| `saveReporting.test.js` | A failed write is reported rather than silently treated as a save. |
| `announce.test.js` | Console summaries for serial file operations: they reach both the console and the agent's buffer, survive the exclusive tap, keep a failure to one line, and — the reason this exists — make `sendCode`'s readiness check fail rather than pass on stale output after a write. |
| `replReadiness.test.js` | Send Code works after reads and read-only batches restore the confirmed friendly prompt; saves and failed REPL exits do not publish a ready prompt. |
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
