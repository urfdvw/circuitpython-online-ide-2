// Serial-backed stand-ins for FileSystemDirectoryHandle / FileSystemFileHandle.
//
// Plain duck typing: these are ordinary objects shaped like the browser's
// handles, so everything that already consumes rootDirHandle keeps working
// untouched. There is no interface or base class, because there is nothing to
// share with the mass-storage path, which uses the browser's real handles.
//
// useZipStorage.js does the same thing for cached zips. That is a parallel,
// unrelated feature; the two deliberately share no code.
//
// Two constraints come from the existing consumers:
//   * Handles must be plain mutable objects. getFolderContent() assigns .parent,
//     .isParent, .fullPath and .extension onto every entry it returns.
//   * isSameEntry() must compare by path, not identity, because we mint a fresh
//     handle object on every call and FolderView relies on the comparison.

import * as ops from "./deviceOps";
import { joinPath } from "./deviceOps";

/** Coerce whatever createWritable().write() was handed into bytes. */
async function toBytes(data) {
    if (data === null || data === undefined) return new Uint8Array(0);
    // The spec also allows {type: "write", data} command objects.
    if (typeof data === "object" && !ArrayBuffer.isView(data) && "type" in data && "data" in data) {
        return toBytes(data.data);
    }
    if (typeof data === "string") return new TextEncoder().encode(data);
    if (data instanceof Blob) return new Uint8Array(await data.arrayBuffer());
    if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    if (data instanceof ArrayBuffer) return new Uint8Array(data);
    return new TextEncoder().encode(String(data));
}

function notFound(path) {
    return new DOMException(`No such file or directory: ${path}`, "NotFoundError");
}

function baseName(path) {
    return path.slice(path.lastIndexOf("/") + 1);
}

/**
 * @param {object} ctx
 * @param {(fn: (session: any) => Promise<any>) => Promise<any>} ctx.run  run a raw REPL session
 * @param {object} ctx.cache
 */
export function makeSerialFileHandle(ctx, path, size = 0) {
    return {
        kind: "file",
        name: baseName(path),
        // Not part of the browser API, but handy for debugging and for our own code.
        devicePath: path,

        async isSameEntry(other) {
            return !!other && other.kind === "file" && other.devicePath === path;
        },

        async getFile() {
            const bytes = await ctx.run((session) => ops.readFile(session, path));
            // The device mtime is unreliable on small builds (pinned to 2000-01-01),
            // so we report now rather than something misleading. Nothing in the app
            // compares mtimes; see the roadmap note.
            return new File([bytes], baseName(path), { lastModified: Date.now() });
        },

        async createWritable() {
            const parts = [];
            return {
                async write(data) {
                    parts.push(await toBytes(data));
                },
                async truncate() {
                    parts.length = 0;
                },
                async close() {
                    let total = 0;
                    for (const p of parts) total += p.length;
                    const joined = new Uint8Array(total);
                    let at = 0;
                    for (const p of parts) {
                        joined.set(p, at);
                        at += p.length;
                    }
                    // restart: saving should leave the board running the new code,
                    // the way the drive workflow's autoreload does. Serial writes
                    // do not trigger autoreload, so we soft-reboot explicitly.
                    await ctx.run((session) => ops.writeFile(session, path, joined), { restart: true });
                    ctx.cache.noteFile(path, joined.length);
                },
                async abort() {
                    parts.length = 0;
                },
            };
        },

        // The mass-storage path needs real permissions; over serial the port
        // permission is the only gate and it is already granted by then.
        async queryPermission() {
            return "granted";
        },
        async requestPermission() {
            return "granted";
        },

        size,
    };
}

export function makeSerialDirectoryHandle(ctx, path) {
    const handle = {
        kind: "directory",
        name: path ? baseName(path) : "CIRCUITPY",
        devicePath: path,

        async isSameEntry(other) {
            return !!other && other.kind === "directory" && other.devicePath === path;
        },

        // isEntryHealthy() decides a directory is dead by letting entries()
        // throw. cache.list() filters a map, so a deleted folder would come back
        // as an empty listing and read as healthy: FolderView would then show an
        // empty view of a folder that no longer exists instead of falling back to
        // the root. So check existence first.
        async *entries() {
            for (const child of await listChecked(ctx, path)) {
                yield [child.name, childHandle(ctx, child)];
            }
        },

        async *values() {
            for (const child of await listChecked(ctx, path)) {
                yield childHandle(ctx, child);
            }
        },

        async *keys() {
            for (const child of await listChecked(ctx, path)) {
                yield child.name;
            }
        },

        async getFileHandle(name, opts = {}) {
            const childPath = joinPath(path, name);
            const meta = await ctx.cache.stat(childPath);
            if (meta) {
                if (meta.type !== "f") {
                    throw new DOMException(`${childPath} is a directory`, "TypeMismatchError");
                }
                return makeSerialFileHandle(ctx, childPath, meta.size);
            }
            if (!opts.create) {
                throw notFound(childPath);
            }
            // touch() is append-mode, so this cannot clobber a file the board
            // already had but the cache had not seen; it returns the real size.
            const size = await ctx.run((session) => ops.touch(session, childPath), { restart: true });
            ctx.cache.noteFile(childPath, size);
            return makeSerialFileHandle(ctx, childPath, size);
        },

        async getDirectoryHandle(name, opts = {}) {
            const childPath = joinPath(path, name);
            const meta = await ctx.cache.stat(childPath);
            if (meta) {
                if (meta.type !== "d") {
                    throw new DOMException(`${childPath} is a file`, "TypeMismatchError");
                }
                return makeSerialDirectoryHandle(ctx, childPath);
            }
            if (!opts.create) {
                throw notFound(childPath);
            }
            await ctx.run((session) => ops.mkdirp(session, childPath), { restart: true });
            ctx.cache.noteDir(childPath);
            return makeSerialDirectoryHandle(ctx, childPath);
        },

        async removeEntry(name, opts = {}) {
            const childPath = joinPath(path, name);
            const meta = await ctx.cache.stat(childPath);
            if (!meta) {
                throw notFound(childPath);
            }
            if (meta.type === "d" && !opts.recursive) {
                const children = await ctx.cache.list(childPath);
                if (children.length) {
                    throw new DOMException(`${childPath} is not empty`, "InvalidModificationError");
                }
            }
            await ctx.run((session) => ops.remove(session, childPath), { restart: true });
            ctx.cache.noteRemoved(childPath);
        },

        /** Path segments from this directory down to `descendant`, or null. */
        async resolve(descendant) {
            const target = descendant?.devicePath;
            if (typeof target !== "string") return null;
            if (target === path) return [];
            const prefix = path === "" ? "/" : path + "/";
            return target.startsWith(prefix) ? target.slice(prefix.length).split("/") : null;
        },

        async queryPermission() {
            return "granted";
        },
        async requestPermission() {
            return "granted";
        },
    };
    return handle;
}

/** List a directory, throwing if it no longer exists. The root always exists. */
async function listChecked(ctx, path) {
    if (path) {
        const meta = await ctx.cache.stat(path);
        if (!meta) {
            throw notFound(path);
        }
        if (meta.type !== "d") {
            throw new DOMException(`${path} is a file`, "TypeMismatchError");
        }
    }
    return ctx.cache.list(path);
}

function childHandle(ctx, child) {
    return child.type === "d"
        ? makeSerialDirectoryHandle(ctx, child.path)
        : makeSerialFileHandle(ctx, child.path, child.size);
}
