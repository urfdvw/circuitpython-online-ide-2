// agentDecision.js
//
// Promise-based user-decision queue for the agent bridge. Bridge API methods
// (cpyAgentBridge.js) call requestAgentDecision() and await the result; the
// AgentDialog.jsx component (mounted while the bridge is enabled) subscribes
// here and renders the active request as a non-blocking floating card, so the
// user can keep operating the IDE while deciding.
//
// Requests are handled one at a time, FIFO. Plain JS — no React.

let subscriber = null;
let active = null;
const queue = [];

function notify() {
    subscriber?.(active);
}

/**
 * Ask the user to confirm or reject an agent action.
 * Resolves true (confirm) or false (reject / dialog UI torn down).
 * Throws if the dialog UI is not mounted (bridge disabled).
 */
export function requestAgentDecision({ title, message, confirmLabel, rejectLabel }) {
    if (!subscriber) {
        throw new Error(
            "Agent dialog UI is not available. Ask the user to turn the AI Agent Bridge ON in the IDE's Tools > AI Agent Bridge tab."
        );
    }
    return new Promise((resolve) => {
        queue.push({ title, message, confirmLabel, rejectLabel, resolve });
        if (!active) {
            active = queue.shift();
            notify();
        }
    });
}

// Called by AgentDialog.jsx when the user clicks a button.
export function resolveActive(accepted) {
    if (!active) return;
    const { resolve } = active;
    active = queue.shift() ?? null;
    resolve(Boolean(accepted));
    notify();
}

// Resolve everything as rejected. Called when the dialog UI unmounts (bridge
// disabled mid-request) so awaiting bridge calls terminate cleanly.
export function rejectAll() {
    const pending = active ? [active, ...queue.splice(0)] : queue.splice(0);
    active = null;
    pending.forEach(({ resolve }) => resolve(false));
    notify();
}

export function getActive() {
    return active;
}

export function subscribe(fn) {
    subscriber = fn;
    return () => {
        if (subscriber === fn) subscriber = null;
    };
}
