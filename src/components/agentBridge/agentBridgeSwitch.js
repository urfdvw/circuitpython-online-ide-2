// agentBridgeSwitch.js
//
// The AI Agent Bridge on/off switch. Deliberately NOT a user config field: it is
// a plain browser-local flag so it stays out of the Settings form, and turning it
// ON goes through a NATIVE window.confirm() — a browser modal that lives outside
// the DOM, so a script driving this page (including the AI agent the switch is
// meant to gate) cannot click or dismiss it.
//
// The authority for the current session is the in-memory `enabled` below, read from
// localStorage ONCE at page load. Writing the key from the console or from a script
// therefore does not enable anything in the running page: within a session the only
// path to ON is setAgentBridgeEnabled(), which asks for confirmation first.
//
// Reads are pull-based (isAgentBridgeEnabled) so the plain-JS bridge can check the
// flag at call time. React components subscribe via useAgentBridgeEnabled().

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "agentBridgeEnabled";
const CHANGE_EVENT = "cpy-agent-bridge-change";

const CONFIRM_TEXT =
    "Turn ON the AI Agent Bridge?\n\n" +
    "While it is on, any script running on this page — including an AI agent — can read and " +
    "modify the files on your board, write to the serial ports, and install or remove libraries.\n\n" +
    "Only continue if you turned this on yourself.";

function readStoredFlag() {
    try {
        return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
        // localStorage can throw in private/blocked contexts — fail closed.
        return false;
    }
}

let enabled = readStoredFlag();

export function isAgentBridgeEnabled() {
    return enabled;
}

/**
 * Turn the bridge on or off. Turning ON asks the user to confirm in a native
 * browser dialog first; if they cancel, nothing changes.
 * @returns {boolean} the resulting state.
 */
export function setAgentBridgeEnabled(next) {
    const wanted = Boolean(next);
    if (wanted && !window.confirm(CONFIRM_TEXT)) {
        return enabled;
    }
    enabled = wanted;
    try {
        localStorage.setItem(STORAGE_KEY, wanted ? "true" : "false");
    } catch (err) {
        // The session still honours the user's choice even if it cannot be stored.
        console.error("[cpyAgent] failed to store the bridge switch:", err);
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return wanted;
}

function subscribe(onChange) {
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

/** React binding for the switch: re-renders when setAgentBridgeEnabled() runs. */
export function useAgentBridgeEnabled() {
    const getSnapshot = useCallback(() => isAgentBridgeEnabled(), []);
    return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
