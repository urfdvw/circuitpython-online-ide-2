import { useCallback, useEffect, useRef, useState } from "react";
import JSZip from "jszip";
import { openDB, deleteDB } from "idb";

/** Proxy fetch to avoid CORS */
async function fetchWithProxy(targetUrl) {
    const PROXY_ENDPOINT = "https://cpy-lib-proxy-663297601284.us-central1.run.app";
    const resp = await fetch(`${PROXY_ENDPOINT}?url=${encodeURIComponent(targetUrl)}`);
    if (!resp.ok) {
        throw new Error(`Failed to fetch: ${resp.status} ${resp.statusText}`);
    }
    return resp;
}

// Reserved key holding the cache's provenance (see downloadZipFromWeb meta). It is
// not part of the cached file tree, so it is filtered out of every listing. Exactly
// one key is reserved — a prefix match would also swallow real bundle paths.
const META_KEY = "__meta__";
const isMetaKey = (key) => key === META_KEY;

// The same db is read by more than one hook instance at a time: useBundles is
// mounted by both the Library Management tab and the agent bridge. Announced after
// a cache is written or cleared so the other instances re-read it instead of
// holding a view that no longer matches what is stored.
const CACHE_CHANGED_EVENT = "cpy-zip-cache-changed";

function announceCacheChanged(dbName) {
    window.dispatchEvent(new CustomEvent(CACHE_CHANGED_EVENT, { detail: { dbName } }));
}

export function useZipStorage(dbName) {
    // The open connection is tagged with the db it belongs to: `dbName` encodes the
    // CircuitPython major, so reusing a connection across a name change would read
    // the wrong version's libraries.
    const dbRef = useRef(null);
    const [preparingZip, setPreparingZip] = useState(false);
    const [zipReady, setZipReady] = useState(false);
    const [zipContents, setZipContents] = useState([]);
    const [cacheMeta, setCacheMeta] = useState(null);
    // Bumped to re-read the cache: another instance announced that it rewrote this
    // db, or we closed our connection to let its rewrite through.
    const [probeTick, setProbeTick] = useState(0);

    // Adjust state during render when the db changes: nothing about the previous
    // cache is true of the new one, and the probe effect below runs asynchronously.
    const [seenDbName, setSeenDbName] = useState(dbName);
    if (seenDbName !== dbName) {
        setSeenDbName(dbName);
        setZipReady(false);
        setZipContents([]);
        setCacheMeta(null);
    }

    // ---------- utils ----------
    const normalizePath = (p) => {
        if (!p) return "";
        let s = p.replace(/\\/g, "/").replace(/\/+/g, "/").trim();
        if (s.startsWith("/")) s = s.slice(1);
        if (s.endsWith("/")) s = s.slice(0, -1);
        return s;
    };

    // Stable across renders (it only touches the ref), so the callbacks below can list
    // it as a dependency without churning.
    const closeCurrentDB = useCallback(() => {
        try {
            dbRef.current?.db?.close?.();
        } catch {
            // ignore errors from closing an already-closed DB
        }
        dbRef.current = null;
    }, []);

    // idb calls this when THIS connection is blocking another one's versionchange —
    // i.e. another instance of this hook is deleting the db to write a fresh bundle.
    // Step aside at once: holding the connection stalls its deleteDB() indefinitely,
    // which would hang the download with no error. What we knew about the cache is
    // void until that instance announces the rewrite is done.
    const stepAside = useCallback(() => {
        closeCurrentDB();
        setZipReady(false);
        setZipContents([]);
        setCacheMeta(null);
    }, [closeCurrentDB]);

    const tryOpenExistingDB = useCallback(async () => {
        try {
            // Check existence first: openDB(name) with no version CREATES the db as a
            // side effect of probing, and the result has no object store — a state
            // ensureDB() (which opens at version 1) can never upgrade out of.
            // indexedDB.databases() is not universal, but this IDE is Chromium-only
            // anyway (it needs File System Access and Web Serial), so the fallback path
            // below is unreachable in practice rather than a silent degradation.
            if (indexedDB.databases) {
                const known = await indexedDB.databases();
                if (!known.some((d) => d.name === dbName)) return null;
            }
            const db = await openDB(dbName, undefined, { blocking: stepAside });
            return db;
        } catch {
            return null;
        }
    }, [dbName, stepAside]);

    const ensureDB = useCallback(async () => {
        // Only reuse the connection when it belongs to the db we are asked for.
        if (dbRef.current?.name === dbName) return dbRef.current.db;
        closeCurrentDB();
        const db = await openDB(dbName, 1, {
            upgrade(d) {
                if (!d.objectStoreNames.contains("entries")) {
                    const store = d.createObjectStore("entries", { keyPath: "path" });
                    store.createIndex("type", "type", { unique: false });
                }
            },
            blocking: stepAside,
        });
        dbRef.current = { name: dbName, db };
        return db;
    }, [dbName, closeCurrentDB, stepAside]);

    const recreateDB = useCallback(async () => {
        closeCurrentDB();
        await deleteDB(dbName, {
            blocked: () => console.warn(`[zipStorage] waiting for another connection to close ${dbName}`),
        });
        const db = await openDB(dbName, 1, {
            upgrade(d) {
                const store = d.createObjectStore("entries", { keyPath: "path" });
                store.createIndex("type", "type", { unique: false });
            },
            blocking: stepAside,
        });
        dbRef.current = { name: dbName, db };
        return db;
    }, [dbName, closeCurrentDB, stepAside]);

    const putEntry = async (db, entry) => db.put("entries", entry);

    const ensureDirsForPath = async (db, path) => {
        const parts = path.split("/");
        let curr = "";
        for (let i = 0; i < parts.length - 1; i++) {
            curr = curr ? `${curr}/${parts[i]}` : parts[i];
            const exists = await db.get("entries", curr);
            if (!exists) {
                await putEntry(db, {
                    path: curr,
                    type: "directory",
                    lastModified: Date.now(),
                });
            }
        }
    };

    const computeStripPrefix = (zip) => {
        const names = Object.keys(zip.files);
        if (names.length === 0) return "";
        const firstSegs = names.map((n) => {
            const s = n.replace(/\\/g, "/");
            const i = s.indexOf("/");
            return i === -1 ? s : s.slice(0, i);
        });
        const first = firstSegs[0];
        const singleRoot = firstSegs.every((s) => s === first) && names.every((n) => n.includes("/") || n === first);
        return singleRoot ? (first.endsWith("/") ? first : first + "/") : "";
    };

    const inferMime = (name) => {
        const ext = name.split(".").pop()?.toLowerCase() || "";
        const map = {
            txt: "text/plain",
            md: "text/markdown",
            json: "application/json",
            js: "application/javascript",
            mjs: "application/javascript",
            cjs: "application/javascript",
            ts: "application/typescript",
            css: "text/css",
            html: "text/html",
            png: "image/png",
            jpg: "image/jpeg",
            jpeg: "image/jpeg",
            gif: "image/gif",
            webp: "image/webp",
            svg: "image/svg+xml",
            pdf: "application/pdf",
            csv: "text/csv",
            xml: "application/xml",
            wasm: "application/wasm",
            py: "text/x-python",
            mpy: "application/x-micropython",
        };
        return map[ext] || "application/octet-stream";
    };

    // ---------- cache check: on mount, on dbName change, and on probeTick ----------
    useEffect(() => {
        let cancelled = false;
        const name = dbName;

        const clear = () => {
            if (cancelled) return;
            setZipReady(false);
            setZipContents([]);
            setCacheMeta(null);
        };

        const readInto = async (db) => {
            const keys = (await db.getAllKeys("entries")).filter((k) => !isMetaKey(k));
            const meta = (await db.get("entries", META_KEY))?.meta ?? null;
            if (cancelled) return;
            setZipContents(keys);
            setZipReady(keys.length > 0);
            setCacheMeta(meta);
        };

        (async () => {
            // Re-read through the connection we already hold when there is one, so a
            // re-probe never swaps the connection out from under an in-flight read.
            if (dbRef.current?.name === name) {
                try {
                    await readInto(dbRef.current.db);
                    return;
                } catch {
                    // the connection was closed under us — reopen below
                    closeCurrentDB();
                }
            }
            const existing = await tryOpenExistingDB();
            if (!existing || !existing.objectStoreNames.contains("entries")) {
                existing?.close();
                clear();
                return;
            }
            try {
                await readInto(existing);
            } catch {
                existing.close();
                clear();
                return;
            }
            if (cancelled) {
                existing.close();
                return;
            }
            closeCurrentDB();
            dbRef.current = { name, db: existing };
        })();

        return () => {
            cancelled = true;
        };
    }, [tryOpenExistingDB, dbName, closeCurrentDB, probeTick]);

    // Another instance rewrote this db: re-read rather than keep a stale view.
    useEffect(() => {
        const onChanged = (e) => {
            if (e.detail?.dbName === dbName) setProbeTick((n) => n + 1);
        };
        window.addEventListener(CACHE_CHANGED_EVENT, onChanged);
        return () => window.removeEventListener(CACHE_CHANGED_EVENT, onChanged);
    }, [dbName]);

    // Close on unmount: a closed tab or a switched-off agent bridge must not keep
    // holding the db open and blocking another instance's rewrite.
    useEffect(() => closeCurrentDB, [closeCurrentDB]);

    // ---------- shared zip processor (buffer → IDB) ----------
    // `meta` records where the cache came from (e.g. the CircuitPython major it was
    // built for), so callers can verify the cache before using it.
    const processZipBuffer = useCallback(
        async (buf, meta = null) => {
            const db = await recreateDB();
            const zip = await JSZip.loadAsync(buf);
            const stripPrefix = computeStripPrefix(zip);

            // collect dirs (only for lib/ paths)
            const dirSet = new Set();
            for (const [rawPath, zipObj] of Object.entries(zip.files)) {
                const orig = rawPath.replace(/\\/g, "/");
                if (!orig || orig === stripPrefix) continue;
                const stripped = stripPrefix && orig.startsWith(stripPrefix) ? orig.slice(stripPrefix.length) : orig;
                if (!stripped) continue;

                // Only process paths that start with lib/
                if (!stripped.startsWith("lib/")) continue;

                if (zipObj.dir) {
                    const d = stripped.endsWith("/") ? stripped.slice(0, -1) : stripped;
                    if (d) dirSet.add(d);
                } else {
                    const parts = stripped.split("/");
                    for (let i = 0; i < parts.length - 1; i++) {
                        const parent = parts.slice(0, i + 1).join("/");
                        if (parent && parent.startsWith("lib/")) dirSet.add(parent);
                    }
                }
            }

            // write dirs
            for (const d of dirSet) {
                await putEntry(db, {
                    path: d,
                    type: "directory",
                    lastModified: Date.now(),
                });
            }

            // write files (only for lib/ paths)
            for (const [rawPath, zipObj] of Object.entries(zip.files)) {
                if (zipObj.dir) continue;
                const orig = rawPath.replace(/\\/g, "/");
                if (!orig || orig === stripPrefix) continue;
                const stripped = stripPrefix && orig.startsWith(stripPrefix) ? orig.slice(stripPrefix.length) : orig;
                if (!stripped) continue;

                // Only process paths that start with lib/
                if (!stripped.startsWith("lib/")) continue;

                await ensureDirsForPath(db, stripped);
                const blob = await zipObj.async("blob");
                await putEntry(db, {
                    path: stripped,
                    type: "file",
                    size: blob.size,
                    mimeType: inferMime(stripped),
                    lastModified: Date.now(),
                    blob,
                });
            }

            // stamp provenance before announcing readiness
            await putEntry(db, { path: META_KEY, type: "meta", meta, lastModified: Date.now() });

            // refresh listing (the meta record is not part of the file tree)
            const allKeys = (await db.getAllKeys("entries")).filter((k) => !isMetaKey(k));
            setZipContents(allKeys);
            setZipReady(allKeys.length > 0);
            setCacheMeta(meta);
            return true;
        },
        [recreateDB]
    );

    // ---------- public: download from proxy ----------
    const downloadZipFromWeb = useCallback(
        async (zipUrl, meta = null) => {
            if (!zipUrl) throw new Error("zipUrl is required.");
            setPreparingZip(true);
            setZipReady(false);
            setZipContents([]);
            setCacheMeta(null);

            try {
                const res = await fetchWithProxy(zipUrl);
                const buf = await res.arrayBuffer();
                const ok = await processZipBuffer(buf, meta);
                return ok;
            } finally {
                setPreparingZip(false);
                // Also on failure: the other instances stepped aside for the delete,
                // so tell them to re-read — a half-written cache reads as unstamped,
                // which is exactly what they should now see.
                announceCacheChanged(dbName);
            }
        },
        [processZipBuffer, dbName]
    );

    // ---------- public: upload local zip (file picker) ----------
    // Takes the same `meta` as downloadZipFromWeb, and for the same reason: callers
    // verify a cache by its stamp before using it, and an unstamped cache is treated as
    // unusable. A locally picked zip must therefore say what it is too.
    const uploadZipFromLocal = useCallback(
        async (meta = null) => {
            const begin = () => {
                setPreparingZip(true);
                setZipReady(false);
                setZipContents([]);
                setCacheMeta(null);
            };

            // Try the modern File System Access API first (nice UX in Chromium)
            if (window.showOpenFilePicker) {
                try {
                    begin();
                    const [handle] = await window.showOpenFilePicker({
                        types: [{ description: "ZIP archives", accept: { "application/zip": [".zip"] } }],
                        excludeAcceptAllOption: false,
                        multiple: false,
                    });
                    if (!handle) return false; // user cancelled
                    const file = await handle.getFile();
                    const buf = await file.arrayBuffer();
                    return await processZipBuffer(buf, meta);
                } catch (err) {
                    // If user cancelled, err.name can be "AbortError"
                    if (err && (err.name === "AbortError" || err.code === 20)) return false;
                    throw err;
                } finally {
                    setPreparingZip(false);
                    // Also on cancel/failure: begin() already cleared what we knew, so the
                    // announce makes this instance re-read and recover the real state.
                    announceCacheChanged(dbName);
                }
            }

            // Fallback: create a hidden <input type="file">
            return new Promise((resolve, reject) => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = ".zip,application/zip";
                input.style.display = "none";

                const onChange = async () => {
                    input.removeEventListener("change", onChange);
                    document.body.removeChild(input);
                    const file = input.files && input.files[0];
                    if (!file) {
                        resolve(false); // user cancelled
                        return;
                    }
                    begin();
                    try {
                        const buf = await file.arrayBuffer();
                        resolve(await processZipBuffer(buf, meta));
                    } catch (e) {
                        reject(e);
                    } finally {
                        setPreparingZip(false);
                        announceCacheChanged(dbName);
                    }
                };

                input.addEventListener("change", onChange);
                document.body.appendChild(input);
                input.click();
            });
        },
        [processZipBuffer, dbName]
    );

    // ================== READONLY FILE-SYSTEM MIMIC ==================

    // helpers for directory lookups (readonly)
    const childPathJoin = (base, name) => (base ? `${base}/${name}` : name);

    const statPath = async (db, pathNorm) => {
        // returns: { type: 'file'|'directory', rec?: entry } or null
        if (isMetaKey(pathNorm)) return null; // the provenance record is not a cached file
        const direct = await db.get("entries", pathNorm);
        if (direct) return { type: direct.type, rec: direct };
        // check if there are any descendants -> treat as directory
        const keys = await db.getAllKeys("entries");
        if (keys.some((k) => k.startsWith(pathNorm + "/"))) {
            return { type: "directory" };
        }
        return null;
    };

    // --- readonly file handle with write guard ---
    const makeFileHandle = (entry) => {
        const name = entry.path.split("/").pop() || "";
        return {
            kind: "file",
            name,
            path: entry.path,
            async getFile() {
                try {
                    return new File([entry.blob], name, {
                        type: entry.mimeType || "application/octet-stream",
                        lastModified: entry.lastModified || Date.now(),
                    });
                } catch {
                    return entry.blob;
                }
            },
            async text() {
                return entry.blob.text();
            },
            async arrayBuffer() {
                return entry.blob.arrayBuffer();
            },
            stream() {
                return entry.blob.stream();
            },
            async createWritable() {
                // Explicitly forbid writes on the mimic
                throw new DOMException("Read-only handle: createWritable() not allowed", "NotAllowedError");
            },
        };
    };

    const listDirectChildren = async (db, dirPath /* normalized, no trailing slash */) => {
        const prefix = dirPath ? dirPath + "/" : "";
        const keys = (await db.getAllKeys("entries")).filter((k) => !isMetaKey(k));
        const seen = new Set();
        const out = [];
        for (const key of keys) {
            if (dirPath && key === dirPath) continue;
            if (!dirPath && key === "") continue;
            if (!key.startsWith(prefix)) continue;

            const rest = key.slice(prefix.length);
            if (!rest) continue;
            const slash = rest.indexOf("/");
            const childName = slash === -1 ? rest : rest.slice(0, slash);
            if (seen.has(childName)) continue;
            seen.add(childName);

            const childPath = prefix + childName;
            const rec = await db.get("entries", childPath);
            if (rec && rec.type === "file") {
                out.push([childName, makeFileHandle(rec)]);
            } else {
                out.push([childName, makeDirectoryHandle(db, childPath)]);
            }
        }
        return out;
    };

    const makeDirectoryHandle = (db, pathNorm) => {
        const name = pathNorm ? pathNorm.split("/").pop() : "";
        return {
            kind: "directory",
            name,
            path: pathNorm,

            // FS Access API: async iterator of [name, handle]
            async *entries() {
                const children = await listDirectChildren(db, pathNorm);
                for (const pair of children) yield pair; // [name, handle]
            },

            // FS Access API: async iterator of handles only
            async *values() {
                const children = await listDirectChildren(db, pathNorm);
                for (const [, handle] of children) yield handle; // handle
            },

            // FS Access API: getDirectoryHandle(name, {create})
            async getDirectoryHandle(childName) {
                const childPath = childPathJoin(pathNorm, String(childName || "").trim());
                const st = await statPath(db, childPath);
                // readonly semantics: ignore opts.create, never create
                if (!st) throw new DOMException(`NotFoundError: ${childPath}`, "NotFoundError");
                if (st.type !== "directory")
                    throw new DOMException(`TypeMismatchError: ${childPath} is a file`, "TypeMismatchError");
                return makeDirectoryHandle(db, childPath);
            },

            // FS Access API: getFileHandle(name, {create})
            async getFileHandle(childName) {
                const childPath = childPathJoin(pathNorm, String(childName || "").trim());
                const st = await statPath(db, childPath);
                if (!st) throw new DOMException(`NotFoundError: ${childPath}`, "NotFoundError");
                if (st.type !== "file")
                    throw new DOMException(`TypeMismatchError: ${childPath} is a directory`, "TypeMismatchError");
                return makeFileHandle(st.rec);
            },
        };
    };

    // ---------- public: getEntryFromCache ----------
    const getEntryFromCache = useCallback(
        async (inputPath) => {
            const db = await ensureDB();
            const p = normalizePath(inputPath || "");
            if (!p) return makeDirectoryHandle(db, ""); // root directory
            if (isMetaKey(p)) throw new DOMException(`NotFoundError: ${p} not found`, "NotFoundError");
            const direct = await db.get("entries", p);
            if (direct) {
                return direct.type === "file" ? makeFileHandle(direct) : makeDirectoryHandle(db, p);
            }
            const keys = await db.getAllKeys("entries");
            if (keys.some((k) => k.startsWith(p + "/"))) {
                return makeDirectoryHandle(db, p);
            }
            throw new DOMException(`NotFoundError: ${p} not found`, "NotFoundError");
        },
        [ensureDB]
    );

    // ---------- public: clearZipCache ----------
    const clearZipCache = useCallback(async () => {
        closeCurrentDB();
        await deleteDB(dbName, {
            blocked: () => console.warn(`[zipStorage] waiting for another connection to close ${dbName}`),
        });
        setZipContents([]);
        setZipReady(false);
        setCacheMeta(null);
        announceCacheChanged(dbName);
    }, [dbName, closeCurrentDB]);

    return {
        downloadZipFromWeb,
        uploadZipFromLocal,
        getEntryFromCache,
        clearZipCache,
        preparingZip,
        zipReady,
        zipContents,
        // Identity of the cache this hook instance reads from: the db it is bound to
        // and the provenance stamped once the write finished. `cacheMeta` is null for
        // a cache written before stamping existed OR one left partial by an
        // interrupted download — callers must treat null as "do not use".
        cacheName: dbName,
        cacheMeta,
    };
}
