import runRawRepl, { withSerialSession } from "./runRawRepl";
import { captureConnection } from "./connection";
import { createFsCache } from "./fsCache";
import { makeSerialDirectoryHandle } from "./serialHandles";
import * as ops from "./deviceOps";

/** File handles and batches belonging to one physical serial connection. */
export function createSerialFileSystem(serial) {
    const { assertCurrent } = captureConnection(serial);
    const identity = serial.writer;
    const run = (fn, opts) => {
        assertCurrent();
        return runRawRepl(serial, fn, opts);
    };
    const loadTree = (runner) => () => runner((session) => ops.walk(session), { label: "listed files" });
    const cache = createFsCache(loadTree(run));
    const rootDirHandle = makeSerialDirectoryHandle({ run, cache, assertCurrent, identity }, "");
    const batch = (fn, opts) => {
        assertCurrent();
        return withSerialSession(serial, async (scopedRun) => {
            const scopedCache = cache.fork(loadTree(scopedRun));
            const root = makeSerialDirectoryHandle({ run: scopedRun, cache: scopedCache, assertCurrent, identity }, "");
            return fn(root);
        }, opts);
    };
    return { rootDirHandle, batch, refresh: () => cache.invalidate() };
}
