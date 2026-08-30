# Serial file system: research notes and roadmap

Written alongside the USB-serial file source (`src/serialFs/`). The protocol
details below cost real effort to establish and the follow-up work may be picked
up much later, so they live here rather than in a chat log.

**Order of follow-up work: MicroPython first, then BLE or WiFi.**

MicroPython is first because it is the cheapest and introduces no new browser API.
The injected Python in `deviceOps.js` is already written to the lowest common
denominator of both firmwares, so it should be reusable as-is; only a small
dialect module is missing. BLE and WiFi each add a new connection type and a new
set of failure modes, and both are easier once the dialect seam has been proven.

## What shipped

`src/serialFs/` speaks plain raw REPL over Web Serial and hands back duck-typed
stand-ins for `FileSystemDirectoryHandle` / `FileSystemFileHandle`, so every
existing consumer of `rootDirHandle` works unchanged. `useFileSource` switches
between that and the mounted CIRCUITPY drive based on the `file_source` general
setting. The two are parallel sources, not an abstraction and an instance.

## Findings that shaped the implementation

1. **No raw-paste mode.** CircuitPython does support it (7.0+, `do_reader_stdin`
   in `shared/runtime/pyexec.c`), contrary to the common claim, but it is broken
   on ESP32-C3/C6/H2 USB-serial-JTAG (adafruit/circuitpython#8658). ViperIDE
   implements plain raw REPL only, and plain raw REPL is fast enough here.
2. **`os.ilistdir` does not exist in CircuitPython.** This is exactly why
   `pyboard.py`'s and `mpremote`'s `fs_ls` fail on it. Use `os.listdir()` +
   `os.stat()`, directory bit `st_mode & 0x4000`.
3. **`binascii` is FULL_BUILD-only** (`py/circuitpy_mpconfig.mk`), so small
   SAMD21-class boards ship without it. Probe that the function *works*
   (`h(b'')`), not just that the import succeeded, then fall back to pure Python.
   Adafruit's `FileOps` hard-imports it and simply breaks on those boards.
4. **`Press any key to enter the REPL.`** is CircuitPython-only and appears on
   every reconnect. Unhandled, the handshake hangs.
5. **Status-bar OSC sequences** (`\x1b]0;...\x1b\\`, from
   `supervisor/shared/status_bar.c`) corrupt reads if not stripped.
6. **Do not touch `supervisor.runtime.autoreload`.** Raw REPL writes never call
   `autoreload_trigger()`, and `main.c` already suspends autoreload around the
   REPL session. Neither reference implementation sets it.
7. **Quote every path through a real Python `repr()`.** `pyboard.py`'s bare
   `'%s'` breaks on any filename containing a quote or backslash.
8. **`storage.unsafe_disable_usb_drive()` is NOT in any released firmware.** It
   exists only on CircuitPython `main` (PR #11124, merged 2026-07-22, closing
   issue #11091). Checked against tags: absent in 9.0.0, 9.2.8, 10.0.0-beta.0 and
   10.0.0; present only on `main`. Calling it on a real board gives
   `AttributeError: 'module' object has no attribute 'unsafe_disable_usb_drive'`.
   In the same released firmware, `storage.disable_usb_drive()` exists but still
   raises `RuntimeError("Cannot change USB devices now")` at runtime, because
   PR #11124 is what made it callable outside boot.py.

   So the only runtime path that works today is
   `storage.remount("/", readonly=False)`, which refuses with
   `RuntimeError("Cannot remount path when visible via USB.")` until the host
   releases the drive. Requiring the user to eject first is a feature: the eject
   is what guarantees the host finished writing, so unlike the unsafe call there
   is no corruption window. `unsafe_disable_usb_drive` is wired up as an optional
   override, gated on `hasattr`, for when it eventually ships.

   Whenever anything is unsupported or fails, fall back to editing `boot.py`
   (`storage.remount("/", readonly=False)`) plus a **hard** reset. That works on
   every firmware and is the advice every failure path ends with.

9. **`st_mtime` is unreliable on small builds.** Without long-integer support the
   seconds for a contemporary date do not fit in a small int, so `os.stat()`
   returns `946684800` (2000-01-01) for every time field. Only timestamps are
   affected; contents and `st_size` are fine. Note this differs between sources:
   mass storage reads real FAT directory times, serial does not. **Do not
   introduce logic that depends on mtime.**

## Anything that polls the filesystem must be gated

The serial source shares one port with the REPL console, and every read is a raw
REPL session that Ctrl-Cs the running program. So any periodic filesystem access
has to be limited to the mass-storage source. `useFileSource` exposes
`autoWatchFiles` for exactly this, and it gates:

- `FolderView`'s 1s folder poll (replaced by a visible `⟳` button)
- `IdeEditor`'s ~2s disk watch, which was the worst offender: `isEntryHealthy()`
  on a file **is** a full read, so each pass read the file twice, per open tab.
  Three tabs cost ~180 execs and ~90 program interruptions per minute.
- `Backup`'s scheduled backup and refresh, since `compareFolders` diffs by
  content and therefore reads every file in both trees.

`useFileSystem`'s own 1s `isEntryHealthy` poll needs no gate: in serial mode its
`rootDirHandle` is null, so it never reaches the port.

**When adding a new workflow, audit for `setInterval` plus any filesystem call
before shipping it.** Note that editor dirtiness never needed disk access at all;
it compares the buffer against the in-memory baseline the editor loaded.

What this gives up is conflict detection, and it is a cheap trade. Over serial the
only writer that can change a file behind the editor's back is code running on the
board, which requires the board to hold write access in the first place, and most
programs never write to the filesystem. Saving is last-writer-wins. Resist adding
a pre-save conflict check to compensate: it would turn every save into an extra
round trip to guard against a rare case.

## Two things that are easy to get wrong here

**getFileHandle({create:true}) must not truncate.** The File System Access API
requires it to be non-destructive for a file that already exists, and callers
lean on that: `path2Handles()` defaults to `create:true`, so merely *reading*
boot.py goes down the create path. Combined with a cache that never
auto-invalidates, any file the board wrote since the last walk is a cache miss.
`touch()` therefore opens `'ab'`, not `'wb'`. pyboard.py's `fs_touch` uses append
for the same reason.

**Entering raw REPL kills the running program, so writes must restart it.**
Serial writes do not trigger CircuitPython's autoreload (only USB MSC, web and
BLE workflow writes do), so without an explicit Ctrl-D on the way out a save
leaves the board parked at `>>>` running nothing, which is the opposite of what
the drive workflow does. `runRawRepl(serial, fn, {restart: true})` handles this;
`serialHandles` passes it for every mutating operation and omits it for reads, so
browsing does not reboot the board over and over.

## supervisor.runtime.usb_connected does not mean what it looks like

It returns `tud_ready()` (`shared-bindings/supervisor/Runtime.c`), i.e. whether
USB is *enumerated*, and the docstring says so: "Returns the USB enumeration
status". It is NOT "the host has CIRCUITPY mounted". Safely ejecting the drive
leaves the USB serial interface up, so it stays true.

We used it to split read-only into "the host holds the drive" versus "boot.py did
not remount", and that told people who had already ejected to go and eject. There
is no read-only way to ask the real question; `remount()` answers it, but by
changing the state. So the query now reports the one fact it can stand behind,
`storage.getmount("/").readonly`, and offers both remedies without guessing.
`usbConnected` is still returned, but only as a diagnostic.

## Ctrl-D means two different things

At the friendly `>>>` prompt it soft-reboots and runs `code.py`. At raw REPL's
`>` prompt it soft-reboots and lands **back in raw REPL** — that is precisely
the trick `pyboard.py`'s `enter_raw_repl(soft_reset=True)` relies on.

Sending it from inside raw REPL to "restart after a save" therefore left the
board parked at `>` running nothing, with `OK` / `soft reboot` / the raw-REPL
banner leaking into the console because the transaction had been released before
those bytes arrived. On a real board it looked like:

```
>>>
[IDE] wrote code.py
OK
soft reboot
raw REPL; CTRL-B to exit
>
```

So: leave raw REPL with Ctrl-B first, release the transaction, then send Ctrl-D
through the ordinary buffered write. Releasing first is not incidental — it is
what lets the reboot banner and the program's own output reach the console
instead of being swallowed by the exclusive tap.

## Failed writes must not look like saves

`writeFileText()` swallows errors into a `confirm()` dialog rather than throwing,
which was harmless while the only source was a mounted drive. Over serial every
save fails with errno 30 whenever CIRCUITPY is mounted, so the editor was clearing
its dirty marker and its close warning on writes that never reached the board.
It now returns a boolean and `IdeEditor.saveFile` only moves the baseline on
success. Any new caller that tracks saved state must check that return value.

## Architecture note for the follow-ups

ViperIDE runs *one* file protocol over *five* transports: `MpRawMode` is
constructed at 14 call sites with no branch on transport type, and every
transport difference reduces to a chunk size and an optional inter-chunk sleep.

CircuitPython is the opposite: *each workflow has its own complete protocol*. Raw
REPL runs in the VM, while the BLE GATT and HTTP workflows run in the supervisor,
outside the VM. That is exactly why those two keep working while `code.py` runs,
and why they do not need a `boot.py` remount.

So there are two axes, and they are not the same axis. When adding a workflow,
give it its own path to producing handles, parallel to the serial one. Do not
build a unified abstraction up front.

## MicroPython (next)

`deviceOps.js` should work unchanged. What differs:

- Soft-reboot banner is `MPY: soft reboot`; CircuitPython prints a bare
  `soft reboot`.
- No `storage` module, so a MicroPython board is never read-only in the
  CircuitPython sense and the write-access tool does not apply.
- `machine` instead of `microcontroller` for board identity.
- No `boot_out.txt`, so `useBoardInfo` returns null. Check what that does to the
  UI before shipping.

## BLE

**The cheap route, and the recommended one.** ViperIDE connects to CircuitPython
over BLE by binding the **CircuitPython serial service**
(`adaf0001-4369-7263-7569-74507974686e`, with TX `adaf0002` / RX `adaf0003`) and
running ordinary raw REPL over it. It touches the `0xFEBB` File Transfer service
only to check `version == 4` and to satisfy the pairing requirement, and never
sends a single File Transfer packet.

So swapping the three io functions `rawRepl.js` takes (`write`, `readUntil`,
`readExactly`) for GATT characteristic reads and writes should be most of the
work; `deviceOps.js` and `serialHandles.js` come along unchanged. MicroPython
over BLE is the same thing against Nordic's real NUS
(`6e400001-b5a3-f393-e0a9-e50e24dcca9e`), so both firmwares land together.

Constraints: raw REPL runs in the VM, so it inherits the errno-30 read-only
behaviour exactly like serial. CircuitPython BLE needs firmware built with
`CIRCUITPY_BLE_FILE_SERVICE=1` (nRF52840, ESP32 with native BLE; **not
RP2040/Pico W**) and the board must be bonded or put into discovery mode by
holding the boot button during the blue-LED window at startup. MicroPython needs
`viper-tools`' `ble_nus.py` + `ble_repl.py` started from `main.py`.

**The expensive route.** The `0xFEBB` binary GATT protocol is the only way to get
supervisor-side writes that need no remount. It costs a full binary state machine
(`READ 0x10`, `WRITE 0x20`, `LISTDIR 0x50`, `MKDIR 0x40`, `DELETE 0x30`,
`MOVE 0x60`, with pacing-based flow control) **plus a silent-reconnect
subsystem**: every mutating operation calls `autoreload_trigger()`, which reloads
the VM and drops the GATT link (`file_transfer.c:660-670`). Adafruit needed
`markMutatingOp` / `awaitPostOpReconnect` / `_rebindAfterSilentReconnect` for
this; see circuitpython/web-editor#377. It is also slow:
`BYTES_PER_WRITE = 20` with `sleep(100)` per chunk. Only worth it if the cheap
route proves insufficient.

## WiFi

**The blocker is browser mixed-content policy, not missing code.** Our site is
HTTPS (GitHub Pages, which also redirects HTTP to HTTPS), and a board's web
workflow is plain HTTP on the LAN. The browser refuses `fetch("http://...")` and
`ws://` from an HTTPS page before any request leaves.

CORS is *not* the problem: the board's `_origin_ok` accepts any non-`http://`
Origin and answers with `Access-Control-Allow-Origin: *`.

**Neither reference project solves this. Both relocate the page origin onto the
device.** CircuitPython firmware serves `/code/`, a ~600-byte stub that pulls the
editor from `https://code.circuitpython.org`; the document origin becomes
`http://<board>/code/`, so its own `http://` and `ws://` calls are same-origin.
Loading an HTTPS subresource into an HTTP page is allowed; only the reverse is
blocked. ViperIDE does the same with `<base href="https://viper-ide.org">` served
from the device, and when it detects the impossible combination it just
navigates (`src/app.js`):

```js
if (window.location.protocol === 'https:' && url.startsWith('ws://')) {
    /* Navigate to device, which should automatically reload and ask for WebREPL password */
    window.location.assign(url.replace('ws://', 'http://'))
}
```

What that means for us:

- **CircuitPython WiFi**: `code.html` is compiled into the firmware and hardcodes
  `code.circuitpython.org`, so we cannot own that stub without forking firmware.
  The honest option is to offer it only when our page is already served from the
  board (detect `location.hostname` ending in `.local` or being an IP, as
  `web.js` does) and explain why otherwise.
- **MicroPython WiFi**: we would control both ends, so ViperIDE's ~150-byte stub
  can be copied directly with `<base href>` pointed at our Pages URL.
- Serving the IDE from `http://localhost` also works, since `127.0.0.1` is on the
  board's CORS allowlist and is treated as a secure context.
- ViperIDE's `wss://` relay (`hub.viper-ide.org`, self-hostable as
  `websocket_relay.cjs`) and its WebRTC transport are the only paths that work
  from HTTPS unmodified. Both are marked experimental upstream.

## Reference sources

- ViperIDE: `src/rawmode.js`, `src/transports/*`, `src/python_utils.js`,
  `src/fs_cache.js`, `src/app.js`, `src/webrepl_content.js`
- `adafruit/circuitpython-repl-js` `repl.js`; `circuitpython/web-editor`
  `js/common/*-file-transfer.js`, `js/workflows/*.js`
- CircuitPython firmware: `shared/runtime/pyexec.c`, `main.c`,
  `supervisor/shared/filesystem.c`, `supervisor/shared/reload.c`,
  `supervisor/shared/status_bar.c`, `supervisor/shared/bluetooth/file_transfer.c`,
  `supervisor/shared/web_workflow/web_workflow.c`, `shared-bindings/storage/__init__.c`
- MicroPython: `tools/pyboard.py`, `tools/mpremote/mpremote/transport*.py`,
  `webrepl_cli.py`
