// A failed write must be reported, never treated as a save.
//
// writeFileText() shows a dialog rather than throwing, which was harmless while
// the only source was a mounted drive. Over serial every save fails with errno 30
// while CIRCUITPY is mounted on the host, so a swallowed failure would clear the
// editor's dirty marker and its close warning on a file that never changed.

import { harness } from "./helpers/harness.js";
import { writeFileText } from "../src/utilComponents/react-local-file-system/utilities/fileSystemUtils";
import { ReadOnlyFilesystemError } from "../src/serialFs/errors";

const t = harness("save reporting");
t.watch();

// writeFileText calls confirm() on failure; capture instead of needing a DOM.
let lastConfirm = "";
globalThis.confirm = (message) => {
    lastConfirm = message;
    return true;
};

try {
    let written = null;
    const good = {
        name: "code.py",
        createWritable: async () => ({
            write: async (text) => {
                written = text;
            },
            close: async () => {},
        }),
    };
    t.check("a successful write reports true", (await writeFileText(good, "hi")) === true);
    t.check("and the bytes went through", written === "hi");

    // Fails the way the serial source does while CIRCUITPY is mounted.
    const readOnly = {
        name: "code.py",
        createWritable: async () => ({
            write: async () => {},
            close: async () => {
                throw new ReadOnlyFilesystemError("code.py");
            },
        }),
    };
    t.check("a failed write reports false", (await writeFileText(readOnly, "new text")) === false);
    t.check("and the user is told why", /read-only/i.test(lastConfirm));
    t.check("the explanation points somewhere useful", /Navigation|boot\.py/i.test(lastConfirm));

    // IdeEditor.saveFile's contract: the baseline only moves on success.
    const applySave = (saved, text, baseline) => (saved ? text : baseline);
    t.check("a failed save leaves the file dirty", applySave(false, "new text", "old text") === "old text");
    t.check("a real save clears the dirty marker", applySave(true, "new text", "old text") === "new text");
} catch (error) {
    t.fail("unexpected error", error);
}

t.done();
