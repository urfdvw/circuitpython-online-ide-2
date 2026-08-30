import { useCallback, useMemo, useRef } from "react";
import runRawRepl, { withSerialSession } from "../serialFs/runRawRepl";
import { createFsCache } from "../serialFs/fsCache";
import { makeSerialDirectoryHandle } from "../serialFs/serialHandles";
import * as ops from "../serialFs/deviceOps";

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
    const cacheRef = useRef(null);

    // `opts.restart` soft-reboots the board afterwards; the handles pass it for
    // operations that change files, so a save leaves the board running the new
    // code rather than parked at the REPL.
    const run = useCallback((fn, opts) => runRawRepl(serial, fn, opts), [serial]);

    // Hold one raw REPL session open across a whole batch of file operations, so
    // scanning or copying many files interrupts the board once instead of once
    // per file. Anything `fn` calls reuses the open session automatically.
    const batch = useCallback((fn, opts) => withSerialSession(serial, fn, opts), [serial]);

    // One cache per connection. Recreated when the port reopens so a swapped
    // board never shows the previous board's tree.
    const cache = useMemo(() => {
        const created = createFsCache(() => run((session) => ops.walk(session), { label: "listed files" }));
        cacheRef.current = created;
        return created;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [run, serialReady]);

    const rootDirHandle = useMemo(() => {
        if (!serialReady) {
            return null;
        }
        // The handle identity stays stable across refreshes on purpose: changing
        // it would send FolderView back to the root every time the user refreshes.
        return makeSerialDirectoryHandle({ run, cache }, "");
    }, [run, cache, serialReady]);

    // No teardown effect for serialReady: the useMemo above is already keyed on
    // it, so a disconnect hands back a brand new empty cache. Invalidating that
    // one would be a no-op.

    // Drops the cached tree; the caller re-lists, which re-reads the device.
    const refresh = useCallback(() => {
        if (cacheRef.current) {
            cacheRef.current.invalidate();
        }
    }, []);

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
