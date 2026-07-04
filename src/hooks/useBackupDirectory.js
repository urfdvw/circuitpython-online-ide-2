import { useEffect, useState } from "react";
import { useFileSystem, isEntryHealthy } from "../utilComponents/react-local-file-system";
import { getBackupDirHandle, setBackupDirHandle } from "../utilFunctions/boardStore";

/**
 * Backup "computer folder" directory, remembered per board (keyed by the board UID)
 * and restored when that board is reconnected.
 *
 * - Picking a folder persists it for the current board UID.
 * - On board (UID) change: a saved folder is restored if the browser still holds
 *   permission; otherwise the Backup tab is asked to show a one-click reconnect
 *   prompt. A board with no saved folder clears the current one (strict per-board).
 * - If a saved folder can't be opened (drive disconnected / folder deleted) we surface
 *   a warning instead of failing silently.
 * - Boards without a UID behave exactly as before (no persistence, no clearing).
 *
 * @param {object|null} boardInfo - parsed board info; uses `boardInfo.device_id` as the UID.
 */
export default function useBackupDirectory(boardInfo) {
    const fs = useFileSystem();
    const uid = boardInfo?.device_id ?? null;

    const [backupRestoreWarning, setBackupRestoreWarning] = useState(null);
    const [backupReconnectName, setBackupReconnectName] = useState(null);

    // User picks a backup folder (requires a user gesture). Persist it for this board.
    async function openBackupDirectory() {
        try {
            const handle = await window.showDirectoryPicker({ mode: "readwrite" });
            if (!handle) return;
            fs.setDirectory(handle);
            setBackupRestoreWarning(null);
            setBackupReconnectName(null);
            if (uid) {
                await setBackupDirHandle(uid, handle);
            }
        } catch (error) {
            // AbortError = user cancelled the picker; ignore it.
            if (error && error.name === "AbortError") return;
            alert(error);
            console.error(error);
        }
    }

    // Restore (or clear) the backup folder whenever the connected board changes.
    useEffect(() => {
        let cancelled = false;
        async function restore() {
            setBackupRestoreWarning(null);
            setBackupReconnectName(null);

            // No UID -> keep today's board-independent behavior (don't touch the folder).
            if (!uid) return;

            let handle = null;
            try {
                handle = await getBackupDirHandle(uid);
            } catch (error) {
                console.error(error);
            }
            if (cancelled) return;

            // Strict per-board: a board with no saved folder starts blank.
            if (!handle) {
                fs.clearDirectory();
                return;
            }

            try {
                const permission = await handle.queryPermission({ mode: "readwrite" });
                if (cancelled) return;

                if (permission === "granted") {
                    if (await isEntryHealthy(handle)) {
                        if (!cancelled) fs.setDirectory(handle);
                    } else if (!cancelled) {
                        fs.clearDirectory();
                        setBackupRestoreWarning(handle.name);
                    }
                } else if (!cancelled) {
                    // Re-granting permission needs a user gesture -> prompt in the Backup tab.
                    fs.clearDirectory();
                    setBackupReconnectName(handle.name);
                }
            } catch (error) {
                console.error(error);
                if (!cancelled) {
                    fs.clearDirectory();
                    setBackupRestoreWarning(handle.name);
                }
            }
        }
        restore();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [uid]);

    // Re-grant permission to the saved folder (requires a user gesture).
    async function reconnectBackupDirectory() {
        if (!uid) return;
        const handle = await getBackupDirHandle(uid);
        if (!handle) {
            setBackupReconnectName(null);
            return;
        }
        try {
            const permission = await handle.requestPermission({ mode: "readwrite" });
            if (permission === "granted" && (await isEntryHealthy(handle))) {
                fs.setDirectory(handle);
                setBackupReconnectName(null);
                setBackupRestoreWarning(null);
            } else {
                setBackupReconnectName(null);
                setBackupRestoreWarning(handle.name);
            }
        } catch (error) {
            console.error(error);
            setBackupReconnectName(null);
            setBackupRestoreWarning(handle.name);
        }
    }

    return {
        openBackupDirectory,
        backupFolderDirectoryReady: fs.directoryReady,
        backupDirHandle: fs.rootDirHandle,
        backupFolderStatusText: fs.statusText,
        backupRestoreWarning,
        backupReconnectName,
        reconnectBackupDirectory,
    };
}
