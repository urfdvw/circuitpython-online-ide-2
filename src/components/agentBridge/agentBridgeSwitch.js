// agentBridgeSwitch.js
//
// The AI Agent Bridge on/off switch. Deliberately NOT a user config field and NOT
// persisted anywhere: the bridge is off at every page load, and the only way to turn
// it on is a NATIVE confirm() — a browser modal that lives outside the DOM, so it
// cannot be styled, faked, or auto-dismissed by page content.
//
// Nothing is stored, on purpose. A remembered "on" would mean one confirmation
// authorises every later session, and the stored key would be a second way in
// (write it, reload, the bridge comes up on). Keeping the flag in memory makes each
// use of the bridge an explicit decision, and costs the user little: a reload drops
// the opened folder and the serial ports too, so a session is being rebuilt anyway.
//
// SCOPE OF THE GUARANTEE. This is a guardrail against an agent enabling the bridge
// on its own initiative, NOT a security boundary against hostile page script. Code
// running in this page's JS context can reach the React click handler directly, and
// could drive the IDE's own UI regardless of this switch. What the confirm buys is
// that an agent following the system prompt (or improvising with plain DOM clicks)
// hits a dialog only the human can answer — and the native confirm is captured at
// module load, below, so a later `window.confirm = () => true` cannot answer it.
//
// Reads are pull-based (isAgentBridgeEnabled) so the plain-JS bridge can check the
// flag at call time. React components subscribe via useAgentBridgeEnabled().

import { useSyncExternalStore } from "react";

const CHANGE_EVENT = "cpy-agent-bridge-change";

// Captured at module load, before app code or an injected script gets a chance to
// replace window.confirm. Falls back to the live lookup only if it is somehow absent.
const hasNativeConfirm = typeof window !== "undefined" && typeof window.confirm === "function";
const nativeConfirm = hasNativeConfirm ? window.confirm.bind(window) : null;

const CONFIRM_TEXT =
    "Turn ON the AI Agent Bridge?\n\n" +
    "While it is on, any script running on this page — including an AI agent — can read and " +
    "modify the files on your board, write to the serial ports, and install or remove libraries.\n\n" +
    "Only continue if you turned this on yourself.";

// The whole state: this page load, nothing else.
let enabled = false;

export function isAgentBridgeEnabled() {
    return enabled;
}

/**
 * Turn the bridge on or off. Turning ON asks the user to confirm in a native
 * browser dialog first; if they cancel, nothing changes. The result lasts until the
 * user turns it off or the page reloads.
 * @returns {boolean} the resulting state.
 */
export function setAgentBridgeEnabled(next) {
    const wanted = Boolean(next);
    const ask = nativeConfirm || ((text) => window.confirm(text));
    if (wanted && !ask(CONFIRM_TEXT)) {
        return enabled;
    }
    enabled = wanted;
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return wanted;
}

function subscribe(onChange) {
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

const getServerSnapshot = () => false;

/** React binding for the switch: re-renders when setAgentBridgeEnabled() runs. */
export function useAgentBridgeEnabled() {
    return useSyncExternalStore(subscribe, isAgentBridgeEnabled, getServerSnapshot);
}
