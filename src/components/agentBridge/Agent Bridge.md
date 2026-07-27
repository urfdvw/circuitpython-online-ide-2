# AI Agent Bridge

This IDE can expose its file, serial, and library tools to an AI agent (such as the [**Claude in Chrome**](https://chromewebstore.google.com/detail/claude/fcoeoabgfenejglbffodgkkbkcdhcgfn) browser extension), letting the agent read and modify the files in your opened folder, read/write both serial channels, and install CircuitPython libraries for your board.

## Setup

1. Click the **Agent Bridge** button at the top of this tab, then click **OK** in the browser dialog that appears, to turn the bridge **ON**.
2. **Open your folder** and **connect your serial port** manually. This is required: the folder picker and serial connection need a real user click, so the agent cannot do them for you.
3. Click **Copy System Prompt** and paste it into the agent's side panel. You only need to paste the system prompt once at the beginning of each conversation. The agent will check your connection and ask what you'd like to work on.
4. Tell the agent what you want to do, then interact with it to refine your project.

## How it works

The IDE exposes an API at `window.__cpyAgent` that wraps the same file, serial, and library tools the IDE uses itself, and the agent runs JavaScript on the page to call those methods. While the bridge is **off**, only `isBridgeOn()` answers — every other method refuses to run — so an agent can tell that it needs your permission instead of failing in confusing ways. The system prompt tells the agent to check `isBridgeOn()` first and ask you to turn the bridge on if it is off, to do its work through these methods rather than by clicking around your IDE, to experiment in the REPL before writing files, to install libraries from the board's CircuitPython bundle, and to read the Plot guide before drawing plots or animations.

Libraries are always installed for the CircuitPython version in your board's `boot_out.txt`. That is enforced in the IDE's code, not left to the agent: downloads and installs are checked against your board's version and refuse to run on a mismatch.

## Camera & Plot access

The agent can look at the Camera tab and the Plot tab by bringing them to the front and taking its own screenshot of the page:

- **Camera requests.** When the agent needs the camera (`ensureCameraReady()`), a small floating card appears near the bottom-right of the IDE. The IDE stays fully usable while the card is up — open the Camera tab and start a camera, then click **"I have opened the camera"**, or click **Reject** to deny the request.
- **Bringing tabs to the front.** `showCamera()` and `showPlot()` make the Camera or Plot tab active and maximize it so the agent's screenshot shows the full view. `showCamera()` also resets the camera zoom/pan to a centered fit — the largest size at which the whole feed stays inside the tab.
- **Getting your layout back.** The agent is told to call `restoreLayout()` as soon as it has taken its screenshot, which leaves the maximized state and returns the IDE to your normal layout. You can also do it yourself at any time with the tabset's restore button.
- **Paused camera.** If you pause the camera, the frozen frame stays on screen — useful for holding something steady in front of the lens while the agent looks.
- **`usb_video` boards.** A CircuitPython board using the [`usb_video`](https://docs.circuitpython.org/en/latest/shared-bindings/usb_video/) module shows up as a regular webcam that the Camera tab can select — this is how the agent views a board's video output.

## Troubleshooting

- **The agent says "The AI Agent Bridge is OFF"** — click the **Agent Bridge** button at the top of this tab and confirm the browser dialog. Everything except `isBridgeOn()` stays blocked until you do.
- **"Folder is not opened" / "Serial is not connected" errors** — open the folder and connect the serial port manually first. The agent cannot trigger these, because they need a user gesture.
- **"Library management is not available" errors** — the library tools only attach while the bridge is on. Make sure the bridge is **ON**; `status()` reports `librariesAvailable`.
- **"Refusing to install libraries from another version"** — the cached bundle belongs to a different CircuitPython version than the board you now have open. Open the Library Management tab and download the bundle again for this board.
- **"The bundle cache is incomplete"** — a previous download was interrupted, or the cache predates this version of the IDE. Download the bundle again from the Library Management tab; nothing is installed from a half-written cache.

## Privacy & safety

The bridge is **off by default**, and turning it on is deliberately made into a decision you have to make yourself:

- The switch is not a setting in the Settings tab. It is a browser-local flag for this site, and the only way to turn it on inside the IDE is the **Agent Bridge** button here.
- Turning it **on** always asks you to confirm in a **native browser dialog** — a real browser prompt, not part of the page, so it cannot be styled or faked by the page and an agent following its instructions will stop and ask you rather than answer it.
- Turning it **off** takes effect immediately, with no confirmation.

**What this does and does not protect against.** The confirmation is a guardrail against an agent switching the bridge on by itself, not a security barrier. Treat it the way you treat any page you have opened: code running in this tab's JavaScript context can reach the IDE's own buttons directly, so it is not something a determined hostile script is stopped by. What it does mean is that using the bridge is an explicit, visible choice on your part, and that the "Agent bridge: ON" badge in the corner tells you when it is live.

While it is on, any script running on this page can read and modify the files in the opened folder, write to the serial ports, install or remove libraries on the board, and bring the Camera and Plot tabs to the front (the agent views them through its own page screenshots). Click the **Agent Bridge** button to turn it off when you are done.

## Appendix: Available methods (`window.__cpyAgent`)

All methods are async — `await` them. File methods operate on the opened device folder.

**Meta**
- `isBridgeOn()` — whether the bridge switch is on. The only method that works while it is off; every other one throws until you turn it on.
- `help()` — full list of methods and descriptions.
- `status()` — which folders and serial channels are ready, board info, and whether the library tools are available.
- `getPlotHelp()` — full Plot/Animation guide (rules, markers, examples) as markdown. The agent reads this before writing code that draws plots or animations via `print()`.
- `getWidgetsHelp()` — full Connected Variable Widgets guide (setup, `connected_variables` usage, widget types) as markdown.
- `getWidgetsSchema()` — JSON schema describing each entry in the board's `/ide/widgets.json` layout. The agent reads this before writing that file so the widget panel is valid.
- `installWidgetsLib()` — install `connected_variables.py` on the board and enable `usb_cdc.data` in `boot.py`. The board must be hard-reset afterward for the `boot.py` change to take effect.

**Files**
- `listFiles(path)` — recursively list entries as `[{ path, kind }]`.
- `readFile(path)` — read a text file.
- `writeFile(path, text)` — write text, creating intermediate folders.
- `createFile(path)` / `createFolder(path)` — create an empty file / folder.
- `deleteEntry(path)` — delete a file or folder.
- `renameEntry(path, newName)` — rename an entry.
- `moveEntry(path, targetDirPath)` — move an entry into another folder.
- `exists(path)` — whether a path exists.

**REPL serial**
- `getSerialLog()` — full REPL history.
- `getSerialSince(cursor)` — incremental output as `{ text, cursor }`.
- `sendSerial(text)` — write raw text to the REPL channel.
- `sendCode(code)` — send and run a block of code.
- `ctrlC()` / `ctrlD()` — interrupt / soft reboot.
- `clearSerialLog()` — clear the agent-side REPL buffer.

**Data serial (usb_cdc.data / Connected Variables)**
- `getDataSerialLog()` — full data-channel history.
- `getDataSerialSince(cursor)` — incremental output as `{ text, cursor }`.
- `sendDataSerial(text)` — write text to the data channel.
- `clearDataSerialLog()` — clear the data-channel buffer.

**Camera & plot**
- `ensureCameraReady()` — check that a camera is live in the Camera tab; if not, shows you a non-blocking request card until a camera is ready or you reject. Returns the camera name, or `false` on reject.
- `showCamera()` — bring the Camera tab to the front, maximize it, and reset the view, so the agent can see the feed in its page screenshot.
- `showPlot()` — bring the Plot tab to the front and maximize it, so the agent can see the chart in its page screenshot.
- `restoreLayout()` — leave the maximized state and put your normal layout back. The agent calls this after each screenshot.

**Libraries (CircuitPython bundle management)**

Manage libraries for the connected board's CircuitPython version, instead of hand-copying `.mpy` files. Typical flow: `libsDownloaded()` → `downloadLibs()` → `searchLibs()` / `getLibInfo()` → `installLib()` / `autoInstallLibs()` → `getInstalledLibs()`. The version comes from your board's `boot_out.txt` — the agent never picks it, and a mismatch is refused rather than installed.

- `libsDownloaded()` — whether the bundle is cached for this board.
- `libsUpToDate()` — check GitHub for a newer bundle.
- `downloadLibs()` — download the bundle(s) for the board's CircuitPython version (one-time, needs internet).
- `getAvailableLibs()` — installable libs in the downloaded bundle.
- `getInstalledLibs()` — libs currently on the board.
- `getLibInfo(name)` — manifest details: version, description, dependencies, and `gitLink` for docs/examples.
- `searchLibs(query)` — find libs by name or description.
- `installLib(name)` — install a lib and its dependencies.
- `uninstallLib(name)` — remove a lib.
- `autoInstallLibs()` — scan the code's imports and install what's needed.
- `getLibProgressSince(cursor)` — incremental install/uninstall progress events (same cursor pattern as the serial logs).
- `clearLibProgress()` — clear the library progress feed.

> The `getSerialSince(cursor)` cursor is how the agent sees *every* change: pass `0` the first time, then pass back the returned `cursor` each time to get only the new output without missing anything.
