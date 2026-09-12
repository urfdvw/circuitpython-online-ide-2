import { useEffect, useState, useRef } from "react";
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
    const { setDirectory, clearDirectory } = fs;
    const selection = useRef(0);
    const uid = boardInfo?.device_id ?? null;

    const [backupRestoreWarning, setBackupRestoreWarning] = useState(null);
    const [backupReconnectName, setBackupReconnectName] = useState(null);

    // User picks a backup folder (requires a user gesture). Persist it for this board.
    async function openBackupDirectory() {
        const request = ++selection.current;
        try {
            const handle = await window.showDirectoryPicker({ mode: "readwrite" });
            if (!handle || request !== selection.current) return;
            setDirectory(handle);
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
        const request = ++selection.current;
        async function restore() {
            setBackupRestoreWarning(null);
            setBackupReconnectName(null);

            // Boards without a UID use the manually selected folder.
            if (!uid) return;
            clearDirectory();

            let handle = null;
            try {
                handle = await getBackupDirHandle(uid);
            } catch (error) {
                console.error(error);
            }
            if (cancelled || request !== selection.current) return;

            // Strict per-board: a board with no saved folder starts blank.
            if (!handle) {
                clearDirectory();
                return;
            }

            try {
                const permission = await handle.queryPermission({ mode: "readwrite" });
                if (cancelled || request !== selection.current) return;

                if (permission === "granted") {
                    if (await isEntryHealthy(handle)) {
                        if (!cancelled && request === selection.current) setDirectory(handle);
                    } else if (!cancelled && request === selection.current) {
                        clearDirectory();
                        setBackupRestoreWarning(handle.name);
                    }
                } else if (!cancelled && request === selection.current) {
                    // Re-granting permission needs a user gesture -> prompt in the Backup tab.
                    clearDirectory();
                    setBackupReconnectName(handle.name);
                }
            } catch (error) {
                console.error(error);
                if (!cancelled && request === selection.current) {
                    clearDirectory();
                    setBackupRestoreWarning(handle.name);
                }
            }
        }
        restore();
        return () => {
            cancelled = true;
        };
    }, [uid, setDirectory, clearDirectory]);

    // Re-grant permission to the saved folder (requires a user gesture).
    async function reconnectBackupDirectory() {
        if (!uid) return;
        const request = ++selection.current;
        let handle;
        try {
            handle = await getBackupDirHandle(uid);
            if (request !== selection.current) return;
            if (!handle) {
                setBackupReconnectName(null);
                return;
            }
            const permission = await handle.requestPermission({ mode: "readwrite" });
            const healthy = permission === "granted" && await isEntryHealthy(handle);
            if (request !== selection.current) return;
            if (healthy) {
                setDirectory(handle);
                setBackupReconnectName(null);
                setBackupRestoreWarning(null);
            } else {
                setBackupReconnectName(null);
                setBackupRestoreWarning(handle.name);
            }
        } catch (error) {
            console.error(error);
            if (request !== selection.current) return;
            setBackupReconnectName(null);
            setBackupRestoreWarning(handle?.name || "Backup folder");
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
