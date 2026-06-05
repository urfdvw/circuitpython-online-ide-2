# Agent Bridge

This IDE can expose its file and serial tools to the Agent (such as **Claude in Chrome** browser
extension), so Agent can read and modify the files in your opened folder and
read/write both serial channels — all in the browser, with no install and no MCP
server.

## How it works

Agent runs JavaScript on the page. When enabled, this IDE attaches an
API at `window.__cpyAgent` that wraps the same file and serial tools the IDE uses
itself. Agent calls those methods to do its work.

## Setup

1. Go to **Settings → General** and turn on **"Enable agent bridge
   (window.\_\_cpyAgent)"**. A small **"Agent bridge: ON"** badge appears in the
   bottom-right corner. (If you just enabled it, refresh the page.)
2. **Open your folder** and **connect your serial port** manually. This is
   required: the folder picker and serial connection need a real user click, so
   Agent cannot do them for you.
3. Open the Agent side panel on this tab and paste the prompt below.

## Prompt to give Agent

After you have opened the folder and connected serial, give Agent the system
prompt:

- **Click the green "Agent bridge: ON" badge** in the bottom-right corner — it
  copies the full system prompt to your clipboard. Paste it into the Agent in
  Chrome side panel.
- Or open the **Agent Prompt** help page to read/copy it manually.

Then replace the last line (`My task: ...`) with what you want Agent to do.

## Available methods (`window.__cpyAgent`)

All methods are async — `await` them. File methods operate on the opened device folder.

**Meta**
- `help()` — full list of methods and descriptions.
- `status()` — which folders and serial channels are ready, plus board info.

**Files**
- `listFiles(path)` — recursively list entries as `[{ path, kind }]`.
- `readFile(path)` — read a text file.
- `writeFile(path, text)` — write text, creating intermediate folders.
- `createFile(path)` / `createFolder(path)` — create an empty file / a folder.
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

> The `getSerialSince(cursor)` cursor is how Agent sees *every* change: pass `0`
> the first time, then pass back the returned `cursor` each time to get only the
> new output without missing anything.

## Troubleshooting

- **Agent says `window.__cpyAgent` is undefined** — the bridge is off or the page
  was not refreshed. Enable it in **Settings → General** and refresh.
- **"Folder is not opened" / "Serial is not connected" errors** — open the folder
  and connect serial manually first; Agent cannot trigger those (they need a
  user gesture).

## Privacy & safety

The bridge is **off by default**. While on, any script running on this page can read and modify the files in the opened folder
and write to the serial port. Turn it off in Settings when you are done.
