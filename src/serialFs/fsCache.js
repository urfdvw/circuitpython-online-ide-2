// Tree cache for the serial file source.
//
// This is load-bearing, not an optimisation. Listing a directory over raw REPL
// costs a Ctrl-C that interrupts whatever the board is running, and FolderView
// calls getFolderContent on every render. Without a cache the board would be
// unusable.
//
// Reads are always served from the cache. Writes update it in place, because we
// already know what changed and re-walking the whole tree after every save would
// double the cost of saving. Only an explicit refresh re-reads the device.

/**
 * @param {() => Promise<Array<{type: "f"|"d", path: string, size: number}>>} loadTree
 */
export function createFsCache(loadTree) {
    /** @type {Map<string, {type: "f"|"d", size: number}> | null} */
    let entries = null;
    let inFlight = null;
    // Bumped by anything that makes an in-flight walk obsolete. A walk that
    // finishes on an old generation discards its result instead of publishing it.
    let generation = 0;

    async function ensure() {
        if (entries) return entries;
        // Collapse concurrent callers onto one device round trip.
        if (!inFlight) {
            const myGeneration = generation;
            inFlight = (async () => {
                const list = await loadTree();
                if (myGeneration !== generation) {
                    // Invalidated while we were walking. Publishing now would
                    // overwrite fresh data with stale, and clearing inFlight would
                    // orphan the newer walk. Join the current generation instead.
                    return ensure();
                }
                const map = new Map();
                for (const e of list) {
                    map.set(e.path, { type: e.type, size: e.size });
                }
                entries = map;
                inFlight = null;
                return map;
            })().catch((err) => {
                if (myGeneration === generation) {
                    inFlight = null;
                }
                throw err;
            });
        }
        return inFlight;
    }

    // A write that lands while a walk is in flight cannot be applied to the tree
    // (there is none yet), and the walk may have read the device before the write
    // happened. Rather than silently drop the update, retire that walk.
    function noteDuringLoad() {
        if (!entries) {
            generation += 1;
            inFlight = null;
            return true;
        }
        return false;
    }

    function parentOf(path) {
        const cut = path.lastIndexOf("/");
        return cut <= 0 ? "" : path.slice(0, cut);
    }

    return {
        ensure,

        /** Drop everything; the next read re-reads the device. */
        invalidate() {
            entries = null;
            inFlight = null;
            generation += 1;
        },

        get loaded() {
            return entries !== null;
        },

        /** Direct children of a directory, as [{name, type, size, path}]. */
        async list(dirPath) {
            const map = await ensure();
            const out = [];
            for (const [path, meta] of map) {
                if (parentOf(path) !== dirPath) continue;
                out.push({ name: path.slice(path.lastIndexOf("/") + 1), path, type: meta.type, size: meta.size });
            }
            out.sort((a, b) => a.name.localeCompare(b.name));
            return out;
        },

        /** Metadata for one path, or null. The root always exists. */
        async stat(path) {
            if (!path) return { type: "d", size: 0 };
            const map = await ensure();
            return map.get(path) || null;
        },

        async exists(path) {
            if (!path) return true;
            const map = await ensure();
            return map.has(path);
        },

        // --- in-place updates, applied after a device operation succeeded ---

        noteFile(path, size) {
            if (noteDuringLoad()) return;
            entries.set(path, { type: "f", size: size || 0 });
        },

        noteDir(path) {
            if (noteDuringLoad()) return;
            // Record every level, so mkdir -p leaves a consistent tree.
            const parts = path.split("/").filter(Boolean);
            let acc = "";
            for (const part of parts) {
                acc += "/" + part;
                if (!entries.has(acc)) entries.set(acc, { type: "d", size: 0 });
            }
        },

        noteRemoved(path) {
            if (noteDuringLoad()) return;
            entries.delete(path);
            // A removed directory takes its whole subtree with it.
            const prefix = path + "/";
            for (const key of [...entries.keys()]) {
                if (key.startsWith(prefix)) entries.delete(key);
            }
        },

        noteRenamed(from, to) {
            if (noteDuringLoad()) return;
            const moved = [];
            const prefix = from + "/";
            for (const [key, meta] of entries) {
                if (key === from) moved.push([key, to, meta]);
                else if (key.startsWith(prefix)) moved.push([key, to + key.slice(from.length), meta]);
            }
            for (const [oldKey, newKey, meta] of moved) {
                entries.delete(oldKey);
                entries.set(newKey, meta);
            }
        },
    };
}
