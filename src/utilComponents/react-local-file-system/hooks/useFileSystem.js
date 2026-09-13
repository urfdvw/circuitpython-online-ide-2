import { useState, useEffect, useCallback } from "react";
import { isEntryHealthy, normalizePath } from "../utilities/fileSystemUtils";

export default function useFileSystem() {
    const [rootDirHandle, setRootDirHandle] = useState(null);
    const [directoryReady, setDirectoryReady] = useState(false);
    const [statusText, setStatusText] = useState("");

    useEffect(() => {
        let cancelled = false;
        let timer;
        setDirectoryReady(false);
        const check = async () => {
            const healthy = await isEntryHealthy(rootDirHandle);
            if (cancelled) return;
            setDirectoryReady(healthy);
            timer = setTimeout(check, 1000);
        };
        check();
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [rootDirHandle]);

    useEffect(() => {
        setStatusText(!rootDirHandle ? "No Directory Connected" :
            directoryReady ? "Connected to " + rootDirHandle.name : "Connecting");
    }, [rootDirHandle, directoryReady]);

    // Open dir
    async function openDirectory() {
        try {
            const dirHandle = await window.showDirectoryPicker({
                mode: "readwrite",
            });
            if (dirHandle) {
                console.log("Directory handle opened.");
                setRootDirHandle(dirHandle);
            } else {
                throw new Error("No directory handle was returned.");
            }
        } catch (error) {
            if (error.name === "AbortError") return;
            alert(error);
            console.error(error);
        }
    }

    // Set/clear the directory handle programmatically (e.g. restore a remembered
    // backup folder from IndexedDB without going through the picker).
    const setDirectory = useCallback((handle) => {
        setRootDirHandle(handle);
    }, []);

    const clearDirectory = useCallback(() => {
        setRootDirHandle(null);
    }, []);

    // Get Handles under root
    async function path2FolderHandles(path = "", create = false) {
        const levels = normalizePath(path);
        // get dir handle
        let folderHandle = rootDirHandle;
        for (const level of levels) {
            if (level.length !== 0) {
                try {
                    folderHandle = await folderHandle.getDirectoryHandle(level, { create: create });
                } catch {
                    // if not found
                    console.log(path + " does not exist");
                    return;
                }
            }
        }
        return folderHandle;
    }

    return {
        openDirectory,
        directoryReady,
        statusText,
        rootDirHandle,
        path2FolderHandles,
        setDirectory,
        clearDirectory,
    };
}
