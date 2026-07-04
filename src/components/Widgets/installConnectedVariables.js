// installConnectedVariables.js
//
// Shared, UI-free install steps for the Connected Variables library, used by
// both the Widgets tool (Widgets.jsx) and the agent bridge (cpyAgentBridge.js):
// write connected_variables.py to the board and make sure boot.py enables the
// usb_cdc.data channel. Callers inject the file writer so each keeps its own
// failure behavior — the Widgets UI passes writeToPath (confirm() dialog on
// failure), the agent bridge passes writeToPathStrict (throws a clean error).
// The board must be HARD-RESET afterward for a boot.py change to apply.

import { getFromPath } from "../../utilComponents/react-local-file-system/utilities/fileSystemUtils";
import CONNECTED_VARIABLES_PY from "./CIRCUITPY/connected_variables.py";

export const LIB_PATH = "connected_variables.py";
export const BOOT_PATH = "boot.py";

export async function writeConnectedVariablesLib(rootDirHandle, writeFile) {
    await writeFile(rootDirHandle, LIB_PATH, CONNECTED_VARIABLES_PY);
}

// Append the usb_cdc.data enable snippet to boot.py if it isn't enabled yet.
// Returns { updated } so callers can tell the user whether a hard reset is needed.
export async function ensureDataSerialInBoot(rootDirHandle, writeFile) {
    let boot = "";
    try {
        boot = await getFromPath(rootDirHandle, BOOT_PATH);
    } catch {
        boot = ""; // boot.py doesn't exist yet
    }
    if (/usb_cdc\.enable\([^)]*\bdata\s*=\s*True/.test(boot)) {
        return { updated: false };
    }
    const base = boot.replace(/\s*$/, "");
    const newBoot = (base ? base + "\n\n" : "") + "import usb_cdc\nusb_cdc.enable(console=True, data=True)\n";
    await writeFile(rootDirHandle, BOOT_PATH, newBoot);
    return { updated: true };
}
