import { useCallback, useEffect, useRef } from "react";
import { useFileSystem } from "../utilComponents/react-local-file-system";
import { isFirefox } from "react-device-detect";
import useSerialFileSystem from "./useSerialFileSystem";

export const FILE_SOURCE = {
    MASS_STORAGE: "usb_mass_storage",
    SERIAL: "usb_serial",
};

/**
 * Picks which file source backs rootDirHandle, from the general setting.
 *
 * This is a switch, not an abstraction layer. The two sources are parallel
 * choices: mass storage hands back the browser's own FileSystemDirectoryHandle,
 * serial hands back a duck-typed stand-in. Neither wraps the other, and the
 * mass-storage path behaves exactly as it always has.
 *
 * Both hooks are always called, because hooks cannot be called conditionally.
 * The inactive one is inert: useFileSystem with no directory picked does no
 * work, and useSerialFileSystem does nothing until the port is open.
 *
 * Takes the whole appConfig so it can both read the setting and own the setter.
 * Changing the source has consequences beyond the value itself (open editor tabs
 * hold handles from the old source), so everything that changes it needs to go
 * through one place; see useFileSourceTabs.
 *
 * @param {object} serial        shared SerialCommunication instance
 * @param {boolean} serialReady  whether the port is open
 * @param {object} appConfig     from useConfig()
 */
export default function useFileSource(serial, serialReady, appConfig) {
    const fileSource = appConfig?.config?.general?.file_source;
    const driveSource = useFileSystem();
    const serialSource = useSerialFileSystem(serial, serialReady);

    // Firefox uses serial for board files, regardless of the stored setting.
    const useSerialSource = fileSource === FILE_SOURCE.SERIAL || isFirefox;
    const active = useSerialSource ? serialSource : driveSource;

    // Whether this source is cheap enough to watch on a timer. Mass storage is,
    // and users expect it to notice external changes. Every other source costs a
    // device round trip per poll, which also interrupts the running program, so
    // those are only read when asked.
    //
    // Consumed by FolderView's folder poll, IdeEditor's disk watch, and Backup's
    // scheduled jobs. Named for the whole set, not just refreshing.
    const autoWatchFiles = !useSerialSource;

    // Already stable (useCallback in useSerialFileSystem). Harmless in drive mode,
    // where there is no cached tree to drop.
    const refresh = serialSource.refresh;

    /**
     * Run a batch of file operations as one unit.
     *
     * On the serial source this holds a single raw REPL session open for the
     * whole batch, so reading twenty files interrupts the running program once
     * rather than twenty times. On the drive source there is nothing to batch,
     * so it just runs. The callback must use its supplied root handle: on
     * serial that handle explicitly owns the session for this batch.
     */
    const serialBatch = serialSource.batch;
    const driveRoot = driveSource.rootDirHandle;
    const batchFileOps = useCallback(
        (fn, opts) => (useSerialSource ? serialBatch(fn, opts) : fn(driveRoot)),
        [useSerialSource, serialBatch, driveRoot]
    );

    // Ready-made wording so the six places that used to hardcode "CIRCUITPY
    // drive" do not each have to branch, and so adding BLE or WiFi later means
    // touching one file.
    const fileSourceName = useSerialSource ? "USB serial" : "CIRCUITPY drive";
    const fileSourceNeeds = useSerialSource
        ? "Connect the serial port in the Navigation tab."
        : "Open the CIRCUITPY drive in Folder View.";

    // The settings form writes file_source directly, so it never reaches the
    // guard in setFileSource below. Catch it here and put the value back, with an
    // explanation: a setting that appears to save and then quietly does nothing
    // is worse than one that refuses.
    //
    // The first correction is silent on purpose. file_source defaults to mass
    // storage in the schema, so Firefox would otherwise pop
    // a dialog on every single page load. Only a later change is the user's own
    // doing and worth interrupting for.
    const hasCorrectedSource = useRef(false);
    useEffect(() => {
        if (!isFirefox || fileSource !== FILE_SOURCE.MASS_STORAGE) {
            return;
        }
        appConfig?.setConfigField?.("general", "file_source", FILE_SOURCE.SERIAL);
        if (hasCorrectedSource.current) {
            alert(
                "This browser cannot open the CIRCUITPY drive.\n\n" +
                    "Opening a folder needs the File System Access API, which Firefox does not support. " +
                    "Board file access has been switched back to USB serial, which works here."
            );
        }
        hasCorrectedSource.current = true;
    }, [fileSource, appConfig]);

    const setFileSource = useCallback(
        (value) => {
            if (value === FILE_SOURCE.MASS_STORAGE && isFirefox) {
                // Refused rather than silently ignored: the setting would appear
                // to change and then not take effect.
                alert(
                    "This browser cannot open the CIRCUITPY drive.\n\n" +
                        "Opening a folder needs the File System Access API, which Firefox does not support. " +
                        "Board files will keep loading over USB serial."
                );
                return;
            }
            appConfig?.setConfigField?.("general", "file_source", value);
        },
        [appConfig]
    );

    // Not memoized: useFileSystem() returns a fresh object every render, so any
    // dependency array containing it would invalidate every time anyway. Callers
    // must not assume a stable identity here.
    return {
        openDirectory: active.openDirectory,
        directoryReady: active.directoryReady,
        statusText: active.statusText,
        rootDirHandle: active.rootDirHandle,
        // Firefox always uses serial, regardless of the stored setting.
        fileSource: useSerialSource ? FILE_SOURCE.SERIAL : FILE_SOURCE.MASS_STORAGE,
        fileSourceName,
        fileSourceNeeds,
        autoWatchFiles,
        refresh,
        batchFileOps,
        setFileSource,
    };
}
