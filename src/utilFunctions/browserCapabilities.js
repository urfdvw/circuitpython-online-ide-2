// What this browser can actually do, asked directly rather than inferred from
// the user agent.
//
// The two file sources need different APIs, and no browser has both-or-neither:
//
//   - USB mass storage needs the File System Access API (showDirectoryPicker).
//     Chromium only; Firefox has no plans to ship it.
//   - USB serial needs Web Serial. Chromium, and Firefox since 151.
//
// So Firefox can reach board files over serial but can never open the CIRCUITPY
// drive. Feature detection rather than sniffing for "is Firefox" means an old
// Firefox is correctly turned away, and Safari would light up on its own if it
// ever shipped either API.

// For reference only: Firefox gained Web Serial in 151. Nothing branches on
// this number — feature detection already keeps older Firefox out, and telling a
// user to "update to the latest version" ages better than naming a version.

/** Web Serial: needed by the serial console and the serial file source. */
export function hasWebSerial() {
    return typeof navigator !== "undefined" && "serial" in navigator;
}

/**
 * File System Access: needed to open the CIRCUITPY drive, and to pick a backup
 * folder on the computer.
 */
export function hasFileSystemAccess() {
    return typeof window !== "undefined" && typeof window.showDirectoryPicker === "function";
}

/** Whether the IDE can reach board files at all, by either route. */
export function canReachBoardFiles() {
    return hasWebSerial() || hasFileSystemAccess();
}

/**
 * Why this browser was turned away, and what would fix it.
 *
 * Only called when canReachBoardFiles() is already false, so the job here is to
 * turn "unsupported" into something the user can act on.
 *
 * @param {{isFirefox?: boolean, isSafari?: boolean, isMobile?: boolean}} detected
 *   from react-device-detect
 * @returns {{reason: string, fix: string|null}}
 */
export function describeUnsupportedBrowser(detected = {}) {
    const { isFirefox, isSafari, isMobile } = detected;

    if (isMobile) {
        return { reason: "This IDE needs a desktop browser.", fix: null };
    }
    if (isFirefox) {
        // The one case an update actually fixes: recent Firefox has Web Serial.
        return {
            reason: "This version of Firefox cannot talk to a microcontroller over USB serial.",
            fix:
                "Update Firefox to the latest version and try again. Note that Firefox cannot open the " +
                "CIRCUITPY drive at all, so the IDE will read and write board files over USB serial.",
        };
    }
    // Safari, and the long tail below it. They get the same advice, and the tail
    // is not worth telling apart: between Chromium, Firefox and Safari there is
    // barely a percent of desktop browsers left.
    return {
        reason: `${isSafari ? "Safari" : "This browser"} cannot talk to a microcontroller: it supports neither Web Serial nor the File System Access API.`,
        fix: "Use Chrome, Edge, or an up-to-date Firefox.",
    };
}
