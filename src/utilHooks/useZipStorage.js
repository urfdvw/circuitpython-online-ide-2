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

export function useZipStorage(dbName) {
    const dbRef = useRef(null);
    const [preparingZip, setPreparingZip] = useState(false);
    const [zipReady, setFileReady] = useState(false);
    const [zipContents, setZipContents] = useState([]);

    // ---------- utils ----------
    const normalizePath = (p) => {
        if (!p) return "";
        let s = p.replace(/\\/g, "/").replace(/\/+/g, "/").trim();
        if (s.startsWith("/")) s = s.slice(1);
        if (s.endsWith("/")) s = s.slice(0, -1);
        return s;
    };

    const tryOpenExistingDB = useCallback(async () => {
        try {
            const db = await openDB(dbName);
            return db;
        } catch {
            return null;
        }
    }, [dbName]);

    const ensureDB = useCallback(async () => {
        if (dbRef.current) return dbRef.current;
        const db = await openDB(dbName, 1, {
            upgrade(d) {
                if (!d.objectStoreNames.contains("entries")) {
                    const store = d.createObjectStore("entries", { keyPath: "path" });
                    store.createIndex("type", "type", { unique: false });
                }
            },
        });
        dbRef.current = db;
        return db;
    }, [dbName]);

    const recreateDB = useCallback(async () => {
        try {
            dbRef.current?.close?.();
        } catch {}
        dbRef.current = null;
        await deleteDB(dbName);
        const db = await openDB(dbName, 1, {
            upgrade(d) {
                const store = d.createObjectStore("entries", { keyPath: "path" });
                store.createIndex("type", "type", { unique: false });
            },
        });
        dbRef.current = db;
        return db;
    }, [dbName]);

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

    // ---------- cache check on mount ----------
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const existing = await tryOpenExistingDB();
            if (!existing) {
                if (!cancelled) {
                    setFileReady(false);
                    setZipContents([]);
                }
                return;
            }
            if (!existing.objectStoreNames.contains("entries")) {
                existing.close();
                if (!cancelled) {
                    setFileReady(false);
                    setZipContents([]);
                }
                return;
            }
            const keys = await existing.getAllKeys("entries");
            if (!cancelled) {
                setZipContents(keys);
                setFileReady(keys.length > 0);
                dbRef.current = existing;
            } else {
                existing.close();
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [tryOpenExistingDB]);

    // ---------- shared zip processor (buffer → IDB) ----------
    const processZipBuffer = useCallback(
        async (buf) => {
            const db = await recreateDB();
            const zip = await JSZip.loadAsync(buf);
            const stripPrefix = computeStripPrefix(zip);

            // collect dirs
            const dirSet = new Set();
            for (const [rawPath, zipObj] of Object.entries(zip.files)) {
                const orig = rawPath.replace(/\\/g, "/");
                if (!orig || orig === stripPrefix) continue;
                const stripped = stripPrefix && orig.startsWith(stripPrefix) ? orig.slice(stripPrefix.length) : orig;
                if (!stripped) continue;

                if (zipObj.dir) {
                    const d = stripped.endsWith("/") ? stripped.slice(0, -1) : stripped;
                    if (d) dirSet.add(d);
                } else {
                    const parts = stripped.split("/");
                    for (let i = 0; i < parts.length - 1; i++) {
                        const parent = parts.slice(0, i + 1).join("/");
                        if (parent) dirSet.add(parent);
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

            // write files
            for (const [rawPath, zipObj] of Object.entries(zip.files)) {
                if (zipObj.dir) continue;
                const orig = rawPath.replace(/\\/g, "/");
                if (!orig || orig === stripPrefix) continue;
                const stripped = stripPrefix && orig.startsWith(stripPrefix) ? orig.slice(stripPrefix.length) : orig;
                if (!stripped) continue;

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

            // refresh listing
            const allKeys = await db.getAllKeys("entries");
            setZipContents(allKeys);
            setFileReady(allKeys.length > 0);
            return true;
        },
        [recreateDB]
    );

    // ---------- public: download from proxy ----------
    const downloadZipFromWeb = useCallback(
        async (zipUrl) => {
            if (!zipUrl) throw new Error("zipUrl is required.");
            setPreparingZip(true);
            setFileReady(false);
            setZipContents([]);

            try {
                const res = await fetchWithProxy(zipUrl);
                const buf = await res.arrayBuffer();
                const ok = await processZipBuffer(buf);
                return ok;
            } finally {
                setPreparingZip(false);
            }
        },
        [processZipBuffer]
    );

    // ---------- public: upload local zip (file picker) ----------
    const uploadZipFromLocal = useCallback(async () => {
        // Try the modern File System Access API first (nice UX in Chromium)
        if (window.showOpenFilePicker) {
            try {
                setPreparingZip(true);
                setFileReady(false);
                setZipContents([]);
                const [handle] = await window.showOpenFilePicker({
                    types: [{ description: "ZIP archives", accept: { "application/zip": [".zip"] } }],
                    excludeAcceptAllOption: false,
                    multiple: false,
                });
                if (!handle) {
                    // user cancelled
                    setPreparingZip(false);
                    return false;
                }
                const file = await handle.getFile();
                const buf = await file.arrayBuffer();
                const ok = await processZipBuffer(buf);
                return ok;
            } catch (err) {
                // If user cancelled, err.name can be "AbortError"
                if (err && (err.name === "AbortError" || err.code === 20)) {
                    setPreparingZip(false);
                    return false;
                }
                setPreparingZip(false);
                throw err;
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
                setPreparingZip(true);
                setFileReady(false);
                setZipContents([]);
                try {
                    const buf = await file.arrayBuffer();
                    const ok = await processZipBuffer(buf);
                    resolve(ok);
                } catch (e) {
                    reject(e);
                } finally {
                    setPreparingZip(false);
                }
            };

            input.addEventListener("change", onChange);
            document.body.appendChild(input);
            input.click();
        });
    }, [processZipBuffer]);

    // ================== READONLY FILE-SYSTEM MIMIC ==================

    // helpers for directory lookups (readonly)
    const childPathJoin = (base, name) => (base ? `${base}/${name}` : name);

    const statPath = async (db, pathNorm) => {
        // returns: { type: 'file'|'directory', rec?: entry } or null
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
        const keys = await db.getAllKeys("entries");
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
            async getDirectoryHandle(childName, opts = {}) {
                const childPath = childPathJoin(pathNorm, String(childName || "").trim());
                const st = await statPath(db, childPath);
                // readonly semantics: ignore opts.create, never create
                if (!st) throw new DOMException(`NotFoundError: ${childPath}`, "NotFoundError");
                if (st.type !== "directory")
                    throw new DOMException(`TypeMismatchError: ${childPath} is a file`, "TypeMismatchError");
                return makeDirectoryHandle(db, childPath);
            },

            // FS Access API: getFileHandle(name, {create})
            async getFileHandle(childName, opts = {}) {
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
        try {
            dbRef.current?.close?.();
        } catch {}
        dbRef.current = null;
        await deleteDB(dbName);
        setZipContents([]);
        setFileReady(false);
    }, [dbName]);

    return {
        downloadZipFromWeb,
        uploadZipFromLocal,
        getEntryFromCache,
        clearZipCache,
        preparingZip,
        zipReady,
        zipContents,
    };
}
