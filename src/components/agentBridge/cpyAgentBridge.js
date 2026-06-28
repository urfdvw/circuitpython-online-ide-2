// cpyAgentBridge.js
//
// Exposes the IDE's file-system and serial tools on `window.__cpyAgent` so that
// Claude in Chrome (which runs JavaScript on the page via the Chrome DevTools
// Protocol) can read/modify files in the opened folder and read/write both
// serial channels.
//
// This file is plain JS (no React). A React component (AgentBridge.jsx) keeps
// `store` pointing at the latest handles / serial instances and maintains the
// serial buffers, then attaches/detaches the API on `window`.
//
// All file operations REUSE the existing utilities in
// react-local-file-system/utilities/fileSystemUtils.js — no file logic is
// reimplemented here.

import {
    path2Handles,
    getFromPath,
    getFolderTree,
    isFolder,
    renameEntry as fsRenameEntry,
    moveEntry as fsMoveEntry,
    removeEntry as fsRemoveEntry,
    checkEntryExists,
} from "../../utilComponents/react-local-file-system/utilities/fileSystemUtils";

// Shared mutable state. AgentBridge.jsx writes the latest references here on
// every render; the API methods below read from it at call time.
export const store = {
    // file system
    rootDirHandle: null,
    rootFolderReady: false,
    // serial — REPL channel
    serial: null,
    serialReady: false,
    sendDataToSerialPort: null,
    sendCode: null,
    sendCtrlC: null,
    sendCtrlD: null,
    // serial — data channel (usb_cdc.data / Connected Variables)
    dataSerial: null,
    dataSerialReady: false,
    sendToDataSerialPort: null,
    clearDataSerialOutput: null,
    // board
    boardInfo: null,
    // serial buffers maintained by AgentBridge.jsx via registerReaderCallback
    replBuf: "",
    dataBuf: "",
    // library management — UI-agnostic functions pushed by AgentLibBridge.jsx
    // (null when the bridge is disabled), plus a pollable progress event feed.
    lib: null,
    libLog: [],
};

const WINDOW_KEY = "__cpyAgent";

// ---- helpers ---------------------------------------------------------------

function getRoot() {
    const root = store.rootDirHandle;
    if (!root) {
        throw new Error(
            "Folder is not opened. The user must open it manually first (folder picker needs a user gesture)."
        );
    }
    return root;
}

function normalize(rawPath) {
    return String(rawPath || "")
        .replace(/\\/g, "/")
        .split("/")
        .map((s) => s.trim())
        .filter(Boolean);
}

// Resolve the PARENT directory handle plus the target entry handle for a path.
// Needed for delete / rename / move / exists where we must operate from the parent.
async function resolveParentAndHandle(root, rawPath) {
    const levels = normalize(rawPath);
    if (levels.length === 0) {
        throw new Error("Empty path");
    }
    const name = levels[levels.length - 1];
    const parentPath = levels.slice(0, -1).join("/");
    const { dirHandle: parent } = await path2Handles(root, parentPath, { create: false });
    let handle;
    try {
        handle = await parent.getFileHandle(name);
    } catch {
        handle = await parent.getDirectoryHandle(name);
    }
    return { parent, handle, name };
}

function getLib() {
    if (!store.lib) {
        throw new Error("Library management is not available. Enable the agent bridge in Settings.");
    }
    return store.lib;
}

// ---- the API ---------------------------------------------------------------

function buildApi() {
    const api = {
        // ---- meta ----------------------------------------------------------
        async help() {
            return {
                note: "All methods are async — await them. File methods operate on the opened device folder.",
                limitations: [
                    "Opening a folder and connecting a serial port require a real user gesture, so the agent cannot trigger them. The user must open the folder and connect serial manually first.",
                ],
                files: {
                    'listFiles(path="")': "Recursively list entries -> [{ path, kind }].",
                    "readFile(path)": "Read a text file -> string.",
                    "writeFile(path, text)": "Write text, creating intermediate folders.",
                    "createFile(path)": "Create an empty file.",
                    "createFolder(path)": "Create a folder.",
                    "deleteEntry(path)": "Delete a file or folder.",
                    "renameEntry(path, newName)": "Rename an entry.",
                    "moveEntry(path, targetDirPath)": "Move an entry into another folder.",
                    "exists(path)": "Whether a path exists -> boolean.",
                },
                replSerial: {
                    "getSerialLog()": "Full REPL serial history -> string.",
                    "getSerialSince(cursor)": "Incremental REPL output -> { text, cursor }.",
                    "sendSerial(text)": "Write raw text to the REPL channel.",
                    "sendCode(code)": "Send and run a block of code.",
                    "ctrlC()": "Send Ctrl-C (interrupt).",
                    "ctrlD()": "Send Ctrl-D (soft reboot).",
                    "clearSerialLog()": "Clear the agent-side REPL buffer.",
                },
                dataSerial: {
                    "getDataSerialLog()": "Full data-channel history -> string.",
                    "getDataSerialSince(cursor)": "Incremental data-channel output -> { text, cursor }.",
                    "sendDataSerial(text)": "Write text to the data channel (usb_cdc.data).",
                    "clearDataSerialLog()": "Clear the data-channel buffer (and UI).",
                },
                libraries: {
                    note: "Manage CircuitPython libraries for the connected board's CPy version. Typical flow: libsDownloaded() -> downloadLibs() -> searchLibs()/getLibInfo() -> installLib()/autoInstallLibs() -> getInstalledLibs().",
                    "libsDownloaded()": "Whether bundles are cached for this board -> { version, downloaded, bundles }.",
                    "libsUpToDate()": "Check GitHub for a newer bundle -> { upToDate, status }.",
                    "downloadLibs()": "Download the bundle(s) for the board's CPy version.",
                    "getAvailableLibs()": "Installable libs in the downloaded bundle -> [{ name, bundle }].",
                    "getInstalledLibs()": "Libs currently on the board -> [{ name, version }].",
                    "getLibInfo(name)": "Manifest details incl. gitLink -> { name, bundle, version, description, dependencies, gitLink }.",
                    "searchLibs(query)": "Find libs by name/description -> [{ name, bundle, description }].",
                    "installLib(name)": "Install a lib + deps -> { ok, installed, upgraded, skipped, failed }.",
                    "uninstallLib(name)": "Remove a lib -> { ok, uninstalled }.",
                    "autoInstallLibs()": "Install libs imported by the code -> { ok, installed, upgraded, skipped, failed }.",
                    "getLibProgressSince(cursor)": "Incremental install/uninstall events -> { events, cursor }.",
                    "clearLibProgress()": "Clear the library progress feed.",
                },
            };
        },

        async status() {
            return {
                rootFolderReady: store.rootFolderReady,
                serialReady: store.serialReady,
                dataSerialReady: store.dataSerialReady,
                boardInfo: store.boardInfo,
                librariesAvailable: Boolean(store.lib),
            };
        },

        // ---- files ---------------------------------------------------------
        async listFiles(path = "") {
            const root = getRoot();
            const { dirHandle } = await path2Handles(root, path, { create: false });
            const tree = await getFolderTree(dirHandle);
            const out = [];
            const walk = (nodes) => {
                for (const node of nodes) {
                    out.push({
                        path: String(node.handle.fullPath || "/" + node.handle.name).replace(/^\/+/, ""),
                        kind: isFolder(node.handle) ? "directory" : "file",
                    });
                    if (node.children) walk(node.children);
                }
            };
            walk(tree);
            return out;
        },

        async readFile(path) {
            return await getFromPath(getRoot(), path);
        },

        async writeFile(path, text) {
            // Direct write (instead of writeToPath) so failures throw a clean
            // error for the agent rather than popping a blocking confirm() dialog.
            const { fileHandle } = await path2Handles(getRoot(), path, {
                create: true,
                treatLastAsFile: true,
            });
            const writable = await fileHandle.createWritable();
            await writable.write(String(text));
            await writable.close();
            return { ok: true, path };
        },

        async createFile(path) {
            await path2Handles(getRoot(), path, { create: true, treatLastAsFile: true });
            return { ok: true, path };
        },

        async createFolder(path) {
            await path2Handles(getRoot(), path, { create: true, treatLastAsFile: false });
            return { ok: true, path };
        },

        async deleteEntry(path) {
            const { parent, handle } = await resolveParentAndHandle(getRoot(), path);
            await fsRemoveEntry(parent, handle);
            return { ok: true, path };
        },

        async renameEntry(path, newName) {
            const { parent, handle } = await resolveParentAndHandle(getRoot(), path);
            await fsRenameEntry(parent, handle, newName);
            return { ok: true, path, newName };
        },

        async moveEntry(path, targetDirPath) {
            const root = getRoot();
            const { parent, handle } = await resolveParentAndHandle(root, path);
            const { dirHandle: targetDir } = await path2Handles(root, targetDirPath, {
                create: true,
                treatLastAsFile: false,
            });
            await fsMoveEntry(parent, handle, targetDir);
            return { ok: true, path, targetDirPath };
        },

        async exists(path) {
            const levels = normalize(path);
            if (levels.length === 0) return true;
            const name = levels[levels.length - 1];
            const parentPath = levels.slice(0, -1).join("/");
            try {
                const { dirHandle: parent } = await path2Handles(getRoot(), parentPath, { create: false });
                return await checkEntryExists(parent, name);
            } catch {
                return false;
            }
        },

        // ---- REPL serial ---------------------------------------------------
        async getSerialLog() {
            return store.replBuf;
        },

        async getSerialSince(cursor = 0) {
            const c = Math.max(0, Number(cursor) || 0);
            return { text: store.replBuf.slice(c), cursor: store.replBuf.length };
        },

        async sendSerial(text) {
            if (!store.sendDataToSerialPort) throw new Error("Serial is not connected.");
            store.sendDataToSerialPort(String(text));
            return { ok: true };
        },

        async sendCode(code) {
            if (!store.sendCode) throw new Error("Serial is not connected.");
            // silent: surface failures as a thrown error instead of a confirm() dialog.
            const result = await store.sendCode(String(code), false, { silent: true });
            if (result && result.ok === false) throw new Error(result.error);
            return { ok: true };
        },

        async ctrlC() {
            if (!store.sendCtrlC) throw new Error("Serial is not connected.");
            store.sendCtrlC();
            return { ok: true };
        },

        async ctrlD() {
            if (!store.sendCtrlD) throw new Error("Serial is not connected.");
            store.sendCtrlD();
            return { ok: true };
        },

        async clearSerialLog() {
            store.replBuf = "";
            return { ok: true };
        },

        // ---- data serial (usb_cdc.data) ------------------------------------
        async getDataSerialLog() {
            return store.dataBuf;
        },

        async getDataSerialSince(cursor = 0) {
            const c = Math.max(0, Number(cursor) || 0);
            return { text: store.dataBuf.slice(c), cursor: store.dataBuf.length };
        },

        async sendDataSerial(text) {
            if (!store.sendToDataSerialPort) throw new Error("Data serial is not connected.");
            store.sendToDataSerialPort(String(text));
            return { ok: true };
        },

        async clearDataSerialLog() {
            store.dataBuf = "";
            if (store.clearDataSerialOutput) store.clearDataSerialOutput();
            return { ok: true };
        },

        // ---- libraries -----------------------------------------------------
        // Manage CircuitPython libraries for the connected board's CPy version.
        // Each method throws a clear error when no board is connected or bundles
        // aren't downloaded yet.
        async libsDownloaded() {
            return await getLib().libsDownloaded();
        },

        async libsUpToDate() {
            return await getLib().libsUpToDate();
        },

        async downloadLibs() {
            return await getLib().downloadLibs();
        },

        async getAvailableLibs() {
            return await getLib().getAvailableLibs();
        },

        async getInstalledLibs() {
            return await getLib().getInstalledLibs();
        },

        async getLibInfo(name) {
            return await getLib().getLibInfo(name);
        },

        async searchLibs(query) {
            return await getLib().searchLibs(query);
        },

        async installLib(name) {
            return await getLib().installLib(name);
        },

        async uninstallLib(name) {
            return await getLib().uninstallLib(name);
        },

        async autoInstallLibs() {
            return await getLib().autoInstallLibs();
        },

        // Incremental progress for long installs — same cursor pattern as the
        // serial logs. Poll while install/autoInstall promises are pending.
        async getLibProgressSince(cursor = 0) {
            const c = Math.max(0, Number(cursor) || 0);
            return { events: store.libLog.slice(c), cursor: store.libLog.length };
        },

        async clearLibProgress() {
            store.libLog = [];
            return { ok: true };
        },
    };
    return api;
}

let attached = false;

export function attachAgentBridge() {
    if (attached) return;
    window[WINDOW_KEY] = buildApi();
    attached = true;
    console.log("[cpyAgent] bridge attached on window.__cpyAgent");
}

export function detachAgentBridge() {
    if (!attached) return;
    try {
        delete window[WINDOW_KEY];
    } catch {
        window[WINDOW_KEY] = undefined;
    }
    attached = false;
    console.log("[cpyAgent] bridge detached");
}
