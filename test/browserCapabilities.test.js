// Which browsers can reach a board, and what to tell the ones that cannot.
//
// The two file sources need different APIs and no browser has both-or-neither:
// Firefox has Web Serial (151+) but will never have the File System Access API,
// Chromium has both, Safari has neither. So the gate asks what the browser can
// do rather than what it is called — a name check would either lock Firefox out
// of a mode it supports, or let an old Firefox through to a broken IDE.

import { harness } from "./helpers/harness.js";
import {
    hasWebSerial,
    hasFileSystemAccess,
    canReachBoardFiles,
    describeUnsupportedBrowser,
} from "../src/utilFunctions/browserCapabilities";

const t = harness("browser capabilities");
t.watch();

// The module reads globals at call time, so each scenario just sets them up.
// defineProperty rather than assignment: node's `navigator` is getter-only.
function withGlobals({ serial, picker }, fn) {
    const saved = {
        navigator: Object.getOwnPropertyDescriptor(globalThis, "navigator"),
        window: Object.getOwnPropertyDescriptor(globalThis, "window"),
    };
    const set = (name, value) =>
        Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

    set("navigator", serial ? { serial: {} } : {});
    set("window", picker ? { showDirectoryPicker: () => {} } : {});
    try {
        return fn();
    } finally {
        for (const [name, descriptor] of Object.entries(saved)) {
            if (descriptor) {
                Object.defineProperty(globalThis, name, descriptor);
            } else {
                delete globalThis[name];
            }
        }
    }
}

try {
    // Chromium: both APIs.
    withGlobals({ serial: true, picker: true }, () => {
        t.check("chromium has web serial", hasWebSerial());
        t.check("chromium has file system access", hasFileSystemAccess());
        t.check("chromium can reach a board", canReachBoardFiles());
    });

    // Firefox 151+: serial only. This is the case the whole change is for.
    withGlobals({ serial: true, picker: false }, () => {
        t.check("modern firefox has web serial", hasWebSerial());
        t.check("modern firefox has no file system access", !hasFileSystemAccess());
        t.check("modern firefox can still reach a board", canReachBoardFiles());
    });

    // Old Firefox / Safari: neither.
    withGlobals({ serial: false, picker: false }, () => {
        t.check("a browser with neither API cannot reach a board", !canReachBoardFiles());
    });

    // A browser with only the picker (no serial) is still usable via the drive.
    withGlobals({ serial: false, picker: true }, () => {
        t.check("drive-only browsers can still reach a board", canReachBoardFiles());
    });

    // ---- what an unsupported browser is told ----
    const firefox = describeUnsupportedBrowser({ isFirefox: true });
    t.check("old firefox is told to update", /update firefox to the latest version/i.test(firefox.fix), firefox.fix);
    t.check(
        "and warned the drive will never work there",
        /cannot open the CIRCUITPY drive/i.test(firefox.fix),
        firefox.fix
    );
    t.check("old firefox is not told to switch browsers", !/use chrome/i.test(firefox.fix || ""), firefox.fix);

    const safari = describeUnsupportedBrowser({ isSafari: true });
    t.check("safari is told to switch browsers", /use chrome|edge|firefox/i.test(safari.fix), safari.fix);
    t.check("safari is not told to update, which would not help", !/update safari/i.test(safari.fix), safari.fix);

    const mobile = describeUnsupportedBrowser({ isMobile: true });
    t.check("mobile is told it needs a desktop", /desktop/i.test(mobile.reason), mobile.reason);
    t.check("mobile is offered no false fix", mobile.fix === null);

    const unknown = describeUnsupportedBrowser({});
    t.check("an unknown browser still gets advice", Boolean(unknown.reason && unknown.fix));
} catch (error) {
    t.fail("unexpected error", error);
}

t.done();
