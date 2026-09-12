// Browser support policy shared by the app route and the product page.
// Firefox 151+ supports serial board files; Safari and mobile stay unsupported.
export function isBrowserSupported(detected = {}) {
    const { isMobile, isSafari, isFirefox, browserVersion } = detected;
    if (isMobile || isSafari) return false;
    return !isFirefox || parseInt(browserVersion, 10) >= 151;
}

/**
 * Why this browser was turned away, and what would fix it.
 *
 * Only called when isBrowserSupported() is already false, so the job here is to
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
