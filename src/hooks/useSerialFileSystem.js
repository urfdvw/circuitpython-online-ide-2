import { useCallback, useMemo, useRef } from "react";
import { createSerialFileSystem } from "../serialFs/fileSystem";

/**
 * The serial file source: board files over raw REPL, shaped like the File System
 * Access API so every existing consumer of rootDirHandle works unchanged.
 *
 * Returns the same shape as useFileSystem() so the two are interchangeable.
 *
 * Two things are deliberately different from the mass-storage path:
 *   - Nothing polls. Every device round trip costs a Ctrl-C that interrupts the
 *     running program, so the tree is read lazily on first use and then only
 *     when something writes or the user asks for a refresh.
 *   - The handle is created as soon as the port is open. Listing is lazy, so
 *     making the handle costs nothing.
 *
 * @param {object} serial       the shared SerialCommunication instance
 * @param {boolean} serialReady whether that port is currently open
 */
export default function useSerialFileSystem(serial, serialReady) {
    const source = useMemo(
        () => {
            if (!serialReady || !serial?.port || !serial?.writer ||
                serial.keepRunning === false || serial.port.connected === false) return null;
            return createSerialFileSystem(serial);
        },
        // The writer changes even when reconnecting to the same SerialPort.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [serial, serialReady, serial?.port, serial?.writer, serial?.keepRunning, serial?.port?.connected]
    );
    const sourceRef = useRef(source);
    sourceRef.current = source;
    const rootDirHandle = source?.rootDirHandle ?? null;
    const batch = useCallback((fn, opts) => {
        if (!source) throw new Error("Connect the serial port before talking to the board.");
        return source.batch(fn, opts);
    }, [source]);
    const refresh = useCallback(() => sourceRef.current?.refresh(), []);

    // No health polling: the port being open is the health signal.
    const directoryReady = Boolean(serialReady && rootDirHandle);

    const statusText = !serialReady
        ? "Connect the serial port to browse board files"
        : "Board files over serial";

    // There is no folder to pick in serial mode. Rather than silently aliasing
    // this to refresh (which made "Open CircuitPy Drive" look broken), say what
    // is actually going on and point at the setting that switches sources.
    const openDirectory = useCallback(() => {
        alert(
            "Board files are currently loaded over USB serial, so there is no folder to open.\n\n" +
                'To use the CIRCUITPY drive instead, switch "Board file access" to USB mass storage ' +
                "in the Navigation tab, or in Settings under General."
        );
    }, []);

    return { openDirectory, directoryReady, statusText, rootDirHandle, refresh, batch };
}
