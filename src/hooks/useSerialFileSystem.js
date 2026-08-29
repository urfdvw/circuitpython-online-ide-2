import { useCallback, useMemo, useRef } from "react";
import RawReplSession from "../serialFs/rawRepl";
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

    // Run `fn` inside one exclusive raw REPL session on the shared port.
    const run = useCallback(
        async (fn) => {
            if (!serial || !serial.port) {
                throw new Error("Connect the serial port before using board files.");
            }
            const release = await serial.startTransaction();
            try {
                const session = new RawReplSession({
                    write: (data) => serial.writeNow(data),
                    readUntil: (match, timeout) => serial.readUntil(match, timeout),
                    readExactly: (count, timeout) => serial.readExactly(count, timeout),
                    drain: () => serial.drainExclusive(),
                });
                return await session.run(fn);
            } finally {
                release();
            }
        },
        [serial]
    );

    // One cache per connection. Recreated when the port reopens so a swapped
    // board never shows the previous board's tree.
    const cache = useMemo(() => {
        const created = createFsCache(() => run((session) => ops.walk(session)));
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

    // In serial mode there is no folder to pick; refreshing is the useful action
    // behind the existing "Open CircuitPy Drive" buttons.
    const openDirectory = refresh;

    return { openDirectory, directoryReady, statusText, rootDirHandle, refresh };
}
