import { useCallback, useEffect, useRef } from "react";
import * as FlexLayout from "flexlayout-react";

/**
 * Tracks which open editors have unsaved changes and guards against losing them.
 *
 * Editors report their dirty status via setFileDirty/clearFileDirty (keyed by the tab's
 * fileKey). The registry lives in a ref so the guards always read the current value without
 * re-renders or stale closures.
 *
 * Returns:
 *  - setFileDirty(fileKey, dirty): editor reports its unsaved status
 *  - clearFileDirty(fileKey): editor drops its entry (on unmount)
 *  - handleLayoutAction(action): pass to <FlexLayout.Layout onAction>; confirms before
 *    closing a tab with unsaved edits (returns undefined to veto, the action to proceed)
 *
 * Also registers a beforeunload guard so the browser warns before leaving the page while any
 * open editor has unsaved changes.
 */
export default function useUnsavedGuards(flexModel) {
    const dirtyFilesRef = useRef({});

    const setFileDirty = useCallback((fileKey, dirty) => {
        dirtyFilesRef.current[fileKey] = dirty;
    }, []);
    const clearFileDirty = useCallback((fileKey) => {
        delete dirtyFilesRef.current[fileKey];
    }, []);
    const isFileDirty = useCallback((fileKey) => Boolean(dirtyFilesRef.current[fileKey]), []);
    const anyDirty = useCallback(() => Object.values(dirtyFilesRef.current).some(Boolean), []);

    // Warn before leaving the page while any open editor has unsaved changes.
    useEffect(() => {
        const handler = (e) => {
            if (anyDirty()) {
                e.preventDefault();
                e.returnValue = "";
            }
        };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [anyDirty]);

    // Intercept editor tab closes: if the file has unsaved edits, confirm before deleting it.
    // onAction is synchronous, so a synchronous window.confirm is required; returning undefined
    // vetoes the close, returning the action lets it proceed.
    const handleLayoutAction = useCallback(
        (action) => {
            if (action.type === FlexLayout.Actions.DELETE_TAB) {
                const node = flexModel.getNodeById(action.data.node);
                const fileKey = node && node.getConfig ? node.getConfig()?.fileKey : null;
                if (fileKey && isFileDirty(fileKey)) {
                    const name = node.getName ? node.getName() : "this file";
                    const ok = window.confirm(`"${name}" has unsaved changes.\nClose without saving?`);
                    if (!ok) {
                        return undefined;
                    }
                    clearFileDirty(fileKey);
                }
            }
            return action;
        },
        [flexModel, isFileDirty, clearFileDirty]
    );

    return { setFileDirty, clearFileDirty, handleLayoutAction };
}
