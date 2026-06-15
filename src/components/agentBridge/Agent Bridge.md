# AI Agent Bridge

This IDE can expose its file and serial tools to an AI agent (such as the [**Claude in Chrome**](https://chromewebstore.google.com/detail/claude/fcoeoabgfenejglbffodgkkbkcdhcgfn) browser extension), letting the agent read and modify the files in your opened folder and read/write both serial channels.

## Setup

1. Click the **Agent Bridge** button at the top of this tab to turn the bridge **ON**.
2. **Open your folder** and **connect your serial port** manually. This is required: the folder picker and serial connection need a real user click, so the agent cannot do them for you.
3. Click **Copy System Prompt**, paste it into the agent's side panel, and replace the last line (`My task: ...`) with what you want the agent to do. You only need to paste the system prompt once at the beginning of each conversation.
4. Interact with the AI agent to refine your project.

## How it works

When the bridge is on, the IDE attaches an API at `window.__cpyAgent` that wraps the same file and serial tools the IDE uses itself. The agent runs JavaScript on the page to call those methods.

## Troubleshooting

- **The agent says `window.__cpyAgent` is undefined** — the bridge is off. Click the **Agent Bridge** button at the top of this tab to turn it on.
- **"Folder is not opened" / "Serial is not connected" errors** — open the folder and connect the serial port manually first. The agent cannot trigger these, because they need a user gesture.

## Privacy & safety

The bridge is **off by default**. While it is on, any script running on this page can read and modify the files in the opened folder and write to the serial port. Click the **Agent Bridge** button to turn it off when you are done.

## Appendix: Available methods (`window.__cpyAgent`)

All methods are async — `await` them. File methods operate on the opened device folder.

**Meta**
- `help()` — full list of methods and descriptions.
- `status()` — which folders and serial channels are ready, plus board info.

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

> The `getSerialSince(cursor)` cursor is how the agent sees *every* change: pass `0` the first time, then pass back the returned `cursor` each time to get only the new output without missing anything.
