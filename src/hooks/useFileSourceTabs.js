import { useEffect, useRef } from "react";
import * as FlexLayout from "flexlayout-react";

/**
 * Close open editor tabs when the board file source changes.
 *
 * An editor tab holds the handle it was opened with, not whatever rootDirHandle
 * currently points at. Left alone across a source switch, a tab opened from the
 * CIRCUITPY drive would keep saving to the drive while the rest of the IDE talks
 * to the board over serial (and would silently stop watching for outside changes,
 * since autoWatchFiles is now false). The reverse is worse: a tab holding a
 * serial handle would keep writing over the REPL while the UI shows the drive.
 * Either way the two views of the same file drift apart with no indication.
 *
 * Closing them is the honest resolution: the file is still one click away in
 * Folder View, now backed by the source the user actually chose.
 *
 * Unsaved work is confirmed *before* the switch (see Navigation), because by the
 * time this effect runs the setting has already changed and there is nothing to
 * cancel.
 *
 * @param {object} flexModel
 * @param {string} fileSource  current value of the general `file_source` setting
 */
export default function useFileSourceTabs(flexModel, fileSource) {
    const previousSource = useRef(fileSource);

    useEffect(() => {
        const from = previousSource.current;
        if (from === fileSource) {
            return;
        }
        previousSource.current = fileSource;
        // The config settles asynchronously on first load; that is not a switch.
        if (from === undefined || fileSource === undefined) {
            return;
        }

        const editorTabs = [];
        flexModel.visitNodes((node) => {
            if (node.getType() === "tab" && node.getComponent() === "editor") {
                editorTabs.push(node.getId());
            }
        });
        for (const id of editorTabs) {
            flexModel.doAction(FlexLayout.Actions.deleteTab(id));
        }
    }, [fileSource, flexModel]);
}
