import { useEffect, useRef } from "react";
import * as FlexLayout from "flexlayout-react";

/**
 * Close open editor tabs when the board file source changes, confirming first if
 * that would discard unsaved work.
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
 * The guard lives HERE rather than on the Navigation toggle because the setting
 * has more than one way in: the General settings form writes `file_source`
 * directly, which would otherwise bypass the confirmation entirely. This effect
 * is the one place every path funnels through, so it also owns the revert when
 * the user declines. FlexLayout's own close guard does not help either, since
 * these deletions are applied to the model rather than raised through onAction.
 *
 * @param {object} flexModel
 * @param {string} fileSource            current `file_source` setting
 * @param {() => boolean} anyDirty       whether any open editor has unsaved edits
 * @param {(value: string) => void} setFileSource  used to undo a declined switch
 */
export default function useFileSourceTabs(flexModel, fileSource, anyDirty, setFileSource) {
    const previousSource = useRef(fileSource);

    useEffect(() => {
        const from = previousSource.current;
        if (from === fileSource) {
            return;
        }
        // The config settles asynchronously on first load; that is not a switch.
        if (from === undefined || fileSource === undefined) {
            previousSource.current = fileSource;
            return;
        }

        const editorTabs = [];
        flexModel.visitNodes((node) => {
            if (node.getType() === "tab" && node.getComponent() === "editor") {
                editorTabs.push(node.getId());
            }
        });

        if (editorTabs.length && anyDirty && anyDirty()) {
            const ok = window.confirm(
                "Some open files have unsaved changes.\n\n" +
                    "Switching how board files are accessed closes all editor tabs. " +
                    "Unsaved changes will be lost.\n\nSwitch anyway?"
            );
            if (!ok) {
                // Put the setting back. previousSource stays on `from`, so the
                // run triggered by that revert sees no change and stops.
                if (setFileSource) {
                    setFileSource(from);
                }
                return;
            }
        }

        previousSource.current = fileSource;
        for (const id of editorTabs) {
            flexModel.doAction(FlexLayout.Actions.deleteTab(id));
        }
    }, [fileSource, flexModel, anyDirty, setFileSource]);
}
