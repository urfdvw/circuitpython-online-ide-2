// cpyAgentBridge.js
//
// Exposes the IDE's file-system and serial tools on `window.__cpyAgent` so that
// Claude in Chrome (which runs JavaScript on the page via the Chrome DevTools
// Protocol) can read/modify files in the opened folder and read/write both
// serial channels.
//
// The API object is always present on `window`, but only `isBridgeOn()` works
// while the bridge switch is off — every other method throws (see
// GATE_EXEMPT/requireBridgeOn below). That way an agent can always discover the
// state and ask the user to turn the bridge on, instead of finding `undefined`.
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
    // writeToPathStrict: failures throw a clean error for the agent instead of
    // popping a blocking confirm() dialog. Creates intermediate folders.
    writeToPathStrict,
    getParentAndHandleFromPath,
    checkPathExists,
} from "../../utilComponents/react-local-file-system/utilities/fileSystemUtils";
import { Actions } from "flexlayout-react";
import { writeConnectedVariablesLib, ensureDataSerialInBoot } from "../Widgets/installConnectedVariables";
import { openTab, findTabByName } from "../../layout/layoutUtils";
import { requestAgentDecision } from "./agentDecision";
import { isAgentBridgeEnabled } from "./agentBridgeSwitch";
import PLOT_HELP from "../../docs/Plot.md";
import WIDGETS_HELP from "../../docs/Widgets.md";
import WIDGET_SCHEMA from "../Widgets/WidgetSchema.json";

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
    // camera controller — registered by DocCam.jsx while the Camera tab is
    // mounted; null when the tab is closed.
    camera: null,
    // flexlayout model — pushed by AgentBridge.jsx; used to bring tabs to front.
    flexModel: null,
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

function getLib() {
    if (!store.lib) {
        throw new Error(
            "Library management is not available. Ask the user to turn the AI Agent Bridge ON in the IDE's Tools > AI Agent Bridge tab."
        );
    }
    return store.lib;
}

// Methods that stay callable while the bridge is OFF. Everything else throws.
const GATE_EXEMPT = new Set(["isBridgeOn"]);

function requireBridgeOn() {
    if (!isAgentBridgeEnabled()) {
        throw new Error(
            "The AI Agent Bridge is OFF, so this method is unavailable. Ask the user to open " +
                "Tools > AI Agent Bridge in the IDE, click the 'Agent Bridge: OFF' button, and confirm the " +
                "browser dialog that appears. You cannot turn it on yourself — it needs a real human click."
        );
    }
}

// Select (opening if needed) the named tab and maximize its tabset, so the
// whole tab is visible for a page screenshot. Idempotent: never un-maximizes
// on repeat calls; restores another maximized tabset first if there is one.
function bringTabToFront(name, component) {
    const model = store.flexModel;
    if (!model) {
        throw new Error("The IDE layout is not ready yet. Retry in a moment.");
    }
    openTab(model, name, component);
    const tabNode = findTabByName(model.getRoot(), name);
    if (!tabNode) {
        throw new Error(`Could not open the ${name} tab.`);
    }
    const tabset = tabNode.getParent();
    if (tabset?.getType() === "tabset") {
        const maximized = model.getMaximizedTabset();
        if (maximized && maximized.getId() !== tabset.getId()) {
            model.doAction(Actions.maximizeToggle(maximized.getId()));
        }
        if (model.getMaximizedTabset()?.getId() !== tabset.getId()) {
            model.doAction(Actions.maximizeToggle(tabset.getId()));
        }
    }
}

// Inverse of the maximize done by bringTabToFront: un-maximize whatever tabset is
// currently maximized, so the IDE goes back to its normal multi-pane layout.
// -> true if something was restored, false if nothing was maximized.
function restoreMaximizedTabset() {
    const model = store.flexModel;
    if (!model) {
        throw new Error("The IDE layout is not ready yet. Retry in a moment.");
    }
    const maximized = model.getMaximizedTabset();
    if (!maximized) {
        return false;
    }
    model.doAction(Actions.maximizeToggle(maximized.getId()));
    return true;
}

// ---- the API ---------------------------------------------------------------

function buildApi() {
    const api = {
        // ---- meta ----------------------------------------------------------

        // The ONLY method that works while the bridge is off. Call it first: if
        // the bridge is off, ask the user to turn it on rather than trying to do
        // it yourself (the switch is behind a native browser dialog on purpose).
        async isBridgeOn() {
            const on = isAgentBridgeEnabled();
            return {
                on,
                note: on
                    ? "The AI Agent Bridge is ON. All window.__cpyAgent methods are available."
                    : "The AI Agent Bridge is OFF — every other method will throw. Ask the user to open " +
                      "Tools > AI Agent Bridge in the IDE, click the 'Agent Bridge: OFF' button, and confirm " +
                      "the browser dialog that appears. You cannot turn it on yourself.",
            };
        },

        async help() {
            return {
                note: "All methods are async — await them. File methods operate on the opened device folder.",
                limitations: [
                    "Opening a folder and connecting a serial port require a real user gesture, so the agent cannot trigger them. The user must open the folder and connect serial manually first.",
                    "Turning the bridge ON also requires a real user gesture (a native browser confirm). isBridgeOn() reports the state; ask the user to flip the switch when it is off.",
                ],
                meta: {
                    "isBridgeOn()":
                        "Whether the AI Agent Bridge switch is on -> { on, note }. Works even while it is off; every other method throws until it is on.",
                    "status()": "What is ready (folder, serial, board, libraries, camera).",
                },
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
                    "installLib(name)":
                        "Install a lib + deps -> { ok, version, installed, upgraded, skipped, failed }. Check ok/error before reporting success.",
                    "uninstallLib(name)": "Remove a lib -> { ok, version, uninstalled, failed }.",
                    "autoInstallLibs()":
                        "Install libs imported by the code -> { ok, version, installed, upgraded, skipped, failed }. Check ok/error before reporting success.",
                    "getLibProgressSince(cursor)": "Incremental install/uninstall events -> { events, cursor }.",
                    "clearLibProgress()": "Clear the library progress feed.",
                },
                plot: {
                    "getPlotHelp()": "Full Plot/Animation guide (rules, usage, examples) -> markdown string. Read it before writing code that draws plots or animations via print().",
                    "showPlot()":
                        "Bring the Plot tab to the front and maximize it. Take a page SCREENSHOT afterward to inspect the plot, then call restoreLayout().",
                    "restoreLayout()":
                        "Un-maximize the tab that showPlot()/showCamera() maximized, putting the user's normal layout back -> { ok, restored }. ALWAYS call this once the screenshot is taken.",
                },
                camera: {
                    note: "The Camera tab shows a webcam or phone camera — including CircuitPython boards presenting a usb_video webcam. ensureCameraReady() shows a dialog to the USER inside the IDE and resolves only after the user responds; just await it (it can take a while), do not also ask in chat.",
                    "ensureCameraReady()":
                        "Check that a camera is live in the Camera tab; if not, asks the user via a non-blocking in-IDE dialog (looping until ready) -> camera name string, or false if the user rejects.",
                    "showCamera()":
                        "Bring the Camera tab to the front, maximize it, and reset the view to a centered fit (the whole feed visible). Take a page SCREENSHOT afterward to see the camera feed. Typical flow: ensureCameraReady() -> showCamera() -> screenshot -> restoreLayout().",
                    "restoreLayout()":
                        "Leave the maximized state and restore the user's layout (also re-fits the camera view). Call it after every showCamera()/showPlot() screenshot.",
                },
                widgets: {
                    note: "Connected Variable widgets form a control panel that syncs with the code over usb_cdc.data (the data serial channel). The layout is stored as /ide/widgets.json on the board — an array of widget objects validated by getWidgetsSchema().",
                    "getWidgetsHelp()": "Full Connected Variable Widgets guide (setup, connected_variables usage, widget types) -> markdown string. Read it before setting up widgets or writing connected-variable code.",
                    "getWidgetsSchema()": "JSON schema describing each entry in /ide/widgets.json -> object. Read it before writing that file so the layout is valid.",
                    "installWidgetsLib()": "Install connected_variables.py on the board and enable usb_cdc.data in boot.py -> { ok, libInstalled, bootUpdated, note }. Board must be HARD-RESET afterward for boot.py to apply.",
                },
            };
        },

        async status() {
            return {
                bridgeOn: true, // gated: unreachable while the bridge is off
                rootFolderReady: store.rootFolderReady,
                serialReady: store.serialReady,
                dataSerialReady: store.dataSerialReady,
                boardInfo: store.boardInfo,
                librariesAvailable: Boolean(store.lib),
                cameraReady: Boolean(store.camera?.isReady()),
            };
        },

        // Full Plot/Animation guide so the agent can author plotting code from code.
        async getPlotHelp() {
            return PLOT_HELP;
        },

        // Connected Variable Widgets guide + the JSON schema for a widgets.json
        // layout, so the agent can build widget control panels from code.
        async getWidgetsHelp() {
            return WIDGETS_HELP;
        },

        async getWidgetsSchema() {
            return WIDGET_SCHEMA;
        },

        // Install the Connected Variables library: write connected_variables.py to
        // the board and make sure boot.py enables the usb_cdc.data channel. Same
        // shared steps (installConnectedVariables.js) as the Widgets tool's
        // "Install Library", but returns a result instead of showing dialogs.
        // The board must be HARD-RESET afterward for boot.py to apply.
        async installWidgetsLib() {
            const root = getRoot();
            await writeConnectedVariablesLib(root, writeToPathStrict);
            const { updated: bootUpdated } = await ensureDataSerialInBoot(root, writeToPathStrict);

            return {
                ok: true,
                libInstalled: true,
                bootUpdated,
                note: bootUpdated
                    ? "connected_variables.py written and boot.py updated to enable usb_cdc.data. The board must be HARD-RESET (unplug/replug or press reset — a soft reboot via ctrlD() will NOT apply boot.py) before the data serial port appears. Then ask the user to connect the Data Serial port."
                    : "connected_variables.py written. boot.py already enables usb_cdc.data.",
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
            await writeToPathStrict(getRoot(), path, text);
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
            const { parent, handle } = await getParentAndHandleFromPath(getRoot(), path);
            await fsRemoveEntry(parent, handle);
            return { ok: true, path };
        },

        async renameEntry(path, newName) {
            const { parent, handle } = await getParentAndHandleFromPath(getRoot(), path);
            await fsRenameEntry(parent, handle, newName);
            return { ok: true, path, newName };
        },

        async moveEntry(path, targetDirPath) {
            const root = getRoot();
            const { parent, handle } = await getParentAndHandleFromPath(root, path);
            const { dirHandle: targetDir } = await path2Handles(root, targetDirPath, {
                create: true,
                treatLastAsFile: false,
            });
            await fsMoveEntry(parent, handle, targetDir);
            return { ok: true, path, targetDirPath };
        },

        async exists(path) {
            // store.rootDirHandle (not getRoot) so a closed folder yields false, not a throw.
            return await checkPathExists(store.rootDirHandle, path);
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

        // ---- camera & plot ---------------------------------------------------
        // The agent inspects the camera feed and the plot by bringing their tab
        // to the front (showCamera/showPlot) and taking a page screenshot — no
        // image data crosses the bridge.

        // Loop until a camera is live in the Camera tab (the user confirms and
        // we re-check) or the user rejects. Uses requestAgentDecision(): the
        // function shows the USER a non-blocking dialog inside the IDE and the
        // promise stays pending until they respond — the IDE remains fully
        // usable meanwhile. -> camera name string | false.
        async ensureCameraReady() {
            for (let attempt = 0; ; attempt++) {
                const cam = store.camera;
                if (cam?.isReady()) return cam.getCameraName();
                const ok = await requestAgentDecision({
                    title: "AI agent needs the camera",
                    message:
                        attempt === 0
                            ? "The AI agent wants to use the camera. Please open the Camera tab and start a camera, then confirm."
                            : "The camera is still not ready. Start a camera in the Camera tab, then confirm.",
                    confirmLabel: "I have opened the camera",
                    rejectLabel: "Reject",
                });
                if (!ok) return false;
            }
        },

        // Bring the Camera tab to the front, maximized, with the view reset so
        // the full feed is visible for a page screenshot.
        async showCamera() {
            bringTabToFront("Camera", "doc_cam");
            // Let the maximize re-layout settle before fitting the view to the
            // (possibly resized) visible area.
            await new Promise((resolve) => setTimeout(resolve, 300));
            store.camera?.resetView();
            return {
                ok: true,
                note: "Camera tab is now active and maximized with the view reset. Take a screenshot of the page to see the camera feed.",
            };
        },

        // Bring the Plot tab to the front, maximized, for a page screenshot.
        async showPlot() {
            bringTabToFront("Plot", "plot");
            return {
                ok: true,
                note: "Plot tab is now active and maximized. Take a screenshot of the page to inspect the plot, then call restoreLayout() to give the user their layout back.",
            };
        },

        // Undo the maximize done by showCamera()/showPlot(). Call it once the
        // screenshot is taken: while a tabset is maximized the rest of the IDE is
        // hidden from the user.
        async restoreLayout() {
            const restored = restoreMaximizedTabset();
            if (restored) {
                // Same settle-then-fit as showCamera: the visible area just changed.
                await new Promise((resolve) => setTimeout(resolve, 300));
                store.camera?.resetView();
            }
            return {
                ok: true,
                restored,
                note: restored
                    ? "The maximized tab was restored — the IDE is back to its normal layout."
                    : "Nothing was maximized; the layout is unchanged.",
            };
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

    // Wrap every method (except the exempt ones) with the switch check, so no
    // method can be added later and accidentally escape the gate. Non-function
    // entries pass through untouched, so adding a plain property later does not
    // turn the whole object into something uncallable.
    return Object.fromEntries(
        Object.entries(api).map(([name, fn]) => [
            name,
            typeof fn !== "function" || GATE_EXEMPT.has(name)
                ? fn
                : async (...args) => {
                      requireBridgeOn();
                      return await fn(...args);
                  },
        ])
    );
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
