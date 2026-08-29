import { useFileSystem } from "../utilComponents/react-local-file-system";
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
 * @param {object} serial        shared SerialCommunication instance
 * @param {boolean} serialReady  whether the port is open
 * @param {string} fileSource    FILE_SOURCE value from the general config
 */
export default function useFileSource(serial, serialReady, fileSource) {
    const driveSource = useFileSystem();
    const serialSource = useSerialFileSystem(serial, serialReady);

    const useSerialSource = fileSource === FILE_SOURCE.SERIAL;
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

    // Not memoized: useFileSystem() returns a fresh object every render, so any
    // dependency array containing it would invalidate every time anyway. Callers
    // must not assume a stable identity here.
    return {
        openDirectory: active.openDirectory,
        directoryReady: active.directoryReady,
        statusText: active.statusText,
        rootDirHandle: active.rootDirHandle,
        fileSource,
        autoWatchFiles,
        refresh,
    };
}
