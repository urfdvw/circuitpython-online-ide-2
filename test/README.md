# Tests

```
npm test              # all Node tests
npm test serial       # only files whose name contains "serial"
npm test -- --browser # Node tests plus browser checks (requires setup below)
npm run test:browser  # browser checks only (requires setup below)
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
| `serviceWorker.test.js` | Complete release installation, cache ownership, offline shell fallback, and failed-update/cache-error recovery. |
| `hostedOffline.test.js` | Build manifest coverage, content hashes, exclusion of hidden metadata, stable cache revisions despite Finder changes, and Git publication checks for missing/ignored deployment files. |
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

The Node suite does not mount the UI. The opt-in browser suite below covers the
editor; other interactions with the FlexLayout model or settings form still need
manual browser checks. In particular
`useFileSourceTabs` (closing editor tabs when the file source changes) is only
verified structurally.

## Follow-up regression coverage

`reviewLifecycle.test.js` exercises ACE command replacement, scheduled/manual job
errors, debugger source changes, and momentary-button release behavior through the
real hooks and a small effect-lifecycle harness. `reviewData.test.js` covers
independent settings tabs, failed persistence, and partial folder comparisons.
`proxyTransfer.test.js` streams real Node/Web streams through progress deadlines.
These hook tests do not substitute for browser mounting behavior.

A separate real-browser test mounts `IdeEditor` with an in-memory file, opens its
actual popup, saves through ACE commands, docks back, and adds a breakpoint. It also
checks failed reads, repeated retries, and save protection until loading succeeds. It
never opens a user drive or serial port. To run it with Node 22+:

1. Start Vite: `npm run dev -- --host 127.0.0.1 --port 5176`.
2. Start a separate Chrome instance with `--remote-debugging-port=9341` and a fresh
   temporary `--user-data-dir`; leave an `about:blank` tab open. Use an isolated
   profile because the test navigates a tab and opens/closes a popup.
3. Run `npm run test:browser`, or `npm test -- --browser` to include the Node suite.

`REVIEW_IDE_ORIGIN` and `REVIEW_CDP_ORIGIN` can override the two local origins. The
browser checks are opt-in: plain `npm test` requires neither Chrome nor a running
development server. With `--browser`, a missing browser/server or failed browser
check makes the command fail; it is not silently skipped.
