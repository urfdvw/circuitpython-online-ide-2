import { parseVersion, compareVersions, versionToString } from "./version";

// Re-exported so existing import sites (LibCardMUI, Navigation, LibManagement, ...)
// keep resolving these from installedLibUtils. The single source of truth is version.js.
export { parseVersion, compareVersions, versionToString };

/* ---- collectPythonTopLevelImports ---- */

export async function collectPythonTopLevelImports(rootHandle) {
    const importSet = new Set();
    const validExtensions = [".py", ".PY", ".python", ".PYTHON"];

    async function traverseDirectory(dirHandle) {
        for await (const [name, handle] of dirHandle.entries()) {
            // skip hidden files/folders
            if (name.startsWith(".")) continue;

            if (handle.kind === "file" && validExtensions.some((ext) => name.endsWith(ext))) {
                try {
                    const file = await handle.getFile();
                    const text = await file.text();
                    extractImports(text, importSet);
                } catch (e) {
                    console.warn("Skipping file due to error:", name, e);
                }
            } else if (handle.kind === "directory") {
                try {
                    await traverseDirectory(handle);
                } catch (e) {
                    console.warn("Skipping directory due to error:", name, e);
                }
            }
        }
    }

    function extractImports(fileContent, set) {
        for (const raw of fileContent.split("\n")) {
            const line = raw.trim();
            if (line.startsWith("import ")) {
                line.replace(/^import\s+/, "")
                    .split(",")
                    .map((p) => p.split(" as ")[0].split(".")[0].trim())
                    .forEach((lib) => lib && set.add(lib));
            } else if (line.startsWith("from ")) {
                const m = line.match(/^from\s+([a-zA-Z_][\w.]*)\s+import/);
                if (m) {
                    const top = m[1].split(".")[0];
                    if (top) set.add(top);
                }
            }
        }
    }

    await traverseDirectory(rootHandle);
    return [...importSet];
}

/* ---- extractLibFileMetadata ---- */

const BAD_FILE_FORMAT = "BAD_FILE_FORMAT";

export async function extractLibFileMetadata(handle) {
    if (!handle) {
        throw new Error("File handle is required");
    }

    const name = handle.name;

    const file = await handle.getFile();
    const result = {};

    if (name.toLowerCase().endsWith(".py")) {
        result.mpy = false;
        const content = await file.text();

        const dunderRe = /(__\w+__)(?:\s*:\s*\w+)?\s*=\s*(?:['"]|\(\s)(.+)['"]/g;
        let m;
        while ((m = dunderRe.exec(content)) !== null) {
            const key = normalizeKey(m[1]); // remove __
            const val = String(m[2]);
            if (key === "version") {
                result[key] = parseVersion(val);
            } else {
                result[key] = val;
            }
        }
        return result;
    }

    if (name.toLowerCase().endsWith(".mpy")) {
        result.mpy = true;

        const buf = new Uint8Array(await file.arrayBuffer());
        const td = new TextDecoder("utf-8");

        const magicPair = String.fromCharCode(buf[0]) + String.fromCharCode(buf[1]);

        let findByRegexpMatch = false;
        let compatibility = null;
        let loc = -1;

        const versionBytes = new TextEncoder().encode("__version__");

        // Please check https://github.com/adafruit/circup/blob/main/circup/shared.py#L140
        if (magicPair === "M\u0003") {
            loc = indexOfBytes(buf, versionBytes) - 1;
            compatibility = { min: null, max: "7.0.0-alpha.1" };
        } else if (magicPair === "C\u0005") {
            loc = indexOfBytes(buf, versionBytes) - 2;
            compatibility = { min: "7.0.0-alpha.1", max: "8.99.99" };
        } else if (magicPair === "C\u0006") {
            findByRegexpMatch = true;
            compatibility = { min: "9.0.0-alpha.1", max: null };
        }

        if (findByRegexpMatch) {
            const version = findSemverNullTerminated(buf, td);
            if (version) {
                result["version"] = parseVersion(version);
            }
        } else if (loc > -1) {
            let offset = 1;
            while (offset < loc) {
                let val = buf[loc - offset];
                if (magicPair === "C\u0005") {
                    val = Math.floor(val / 2);
                }
                if (val === offset - 1) {
                    const start = loc - offset + 1;
                    const end = loc;
                    const slice = buf.slice(start, end);
                    const versionStr = td.decode(slice);
                    result["version"] = parseVersion(versionStr);
                    break;
                }
                offset += 1;
            }
        }

        if (compatibility) {
            result["compatibility"] = compatibility;
        } else {
            result["version"] = BAD_FILE_FORMAT;
        }

        return result;
    }

    throw new Error("Unsupported file type: " + name);
}

function normalizeKey(key) {
    // turn "__version__" -> "version"
    return key.replace(/^__/, "").replace(/__$/, "");
}

function indexOfBytes(haystack, needle) {
    if (needle.length === 0) return 0;
    outer: for (let i = 0; i <= haystack.length - needle.length; i++) {
        for (let j = 0; j < needle.length; j++) {
            if (haystack[i + j] !== needle[j]) continue outer;
        }
        return i;
    }
    return -1;
}

function findSemverNullTerminated(buf, td) {
    const MAX_DECODE = Math.min(buf.length, 2 * 1024 * 1024);
    const text = td.decode(buf.slice(0, MAX_DECODE));
    // eslint-disable-next-line no-control-regex -- the NUL terminator is the marker we search for
    const m = /(\d+\.\d+\.\d+)\x00/.exec(text);
    return m ? m[1] : null;
}

/* ---- getInstalledLibVersions ----*/

/**
 * Treat only numbers as a valid version; anything else = failure.
 */
function isValidVersion(v) {
    return (
        !!v &&
        typeof v === "object" &&
        Number.isInteger(v.major) &&
        Number.isInteger(v.minor) &&
        Number.isInteger(v.patch)
    );
}

/**
 * Case-insensitive .py / .mpy check.
 */
function isPyOrMpy(name) {
    const lower = name.toLowerCase();
    return lower.endsWith(".py") || lower.endsWith(".mpy");
}

/**
 * Depth-first: find the first file in dir (or its subdirs) that yields a valid version.
 * Returns the version object, or null if none found.
 * @param {FileSystemDirectoryHandle} dirHandle
 * @returns {Promise<{major:number,minor:number,patch:number} | null>}
 */
async function findVersionInTree(dirHandle) {
    // Gather entries and sort: files first, then directories; both lexicographically
    const entries = [];
    for await (const [name, handle] of dirHandle.entries()) {
        entries.push([name, handle]);
    }
    entries.sort(([aName, aH], [bName, bH]) => {
        if (aH.kind !== bH.kind) return aH.kind === "file" ? -1 : 1;
        return aName.localeCompare(bName);
    });

    // Try files in this directory first
    for (const [name, handle] of entries) {
        if (handle.kind === "file" && isPyOrMpy(name)) {
            try {
                const meta = await extractLibFileMetadata(handle);
                if (isValidVersion(meta?.version)) return meta.version;
            } catch (e) {
                // treat any error as failure and continue
                console.log("extractLibFileMetadata error (ignored):", name, e);
            }
        }
    }

    // Then recurse into subdirectories
    for (const [name, handle] of entries) {
        if (handle.kind === "directory") {
            try {
                const v = await findVersionInTree(handle);
                if (v) return v;
            } catch (e) {
                console.log("findVersionInTree error (ignored):", name, e);
            }
        }
    }

    return null;
}

/**
 * Main: given folder handle A, return successful lib versions only.
 * Each direct child of A is a lib:
 *  - If child is a .py/.mpy file → parse its version.
 *  - If child is a directory → DFS to find first parseable .py/.mpy inside it.
 *
 * Returns:
 *   [{ name: file_or_folder_name, version: {major, minor, patch} }, ...]
 *
 * Children that fail to produce a valid version are omitted.
 *
 * @param {FileSystemDirectoryHandle} rootHandle
 * @returns {Promise<Array<{name: string, version: {major:number, minor:number, patch:number}}>>}
 */
export async function getInstalledLibVersions(rootHandle) {
    if (!rootHandle || rootHandle.kind !== "directory") {
        throw new Error("A directory handle is required");
    }

    // Collect direct children (libs) in deterministic order
    const children = [];
    for await (const [name, handle] of rootHandle.entries()) {
        children.push([name, handle]);
    }
    children.sort(([a], [b]) => a.localeCompare(b));

    const results = [];

    for (const [name, handle] of children) {
        if (handle.kind === "file") {
            if (!isPyOrMpy(name)) continue; // ignore non .py/.mpy files as libs
            try {
                const meta = await extractLibFileMetadata(handle);
                if (isValidVersion(meta?.version)) {
                    results.push({ name, version: meta.version });
                }
            } catch (e) {
                console.log("extractLibFileMetadata error (ignored):", name, e);
            }
        } else if (handle.kind === "directory") {
            try {
                const v = await findVersionInTree(handle);
                if (v) {
                    results.push({ name, version: v });
                }
            } catch (e) {
                console.log("findVersionInTree error (ignored):", name, e);
            }
        }
        // anything else is ignored
    }

    return results;
}

export function resolveDependenciesFromJsonStrings(dataJsonList, targetNames) {
    // 1) Merge all parsed JSON objects into a single map
    const merged = {};
    for (const s of dataJsonList || []) {
        if (typeof s !== "string") continue;
        try {
            const obj = JSON.parse(s);
            if (obj && typeof obj === "object" && !Array.isArray(obj)) {
                for (const k of Object.keys(obj)) {
                    // later entries override earlier ones key-by-key
                    merged[k] = { ...(merged[k] || {}), ...obj[k] };
                }
            }
        } catch {
            // ignore invalid JSON strings
        }
    }

    // 2) DFS over dependencies (internal + external)
    const visited = new Set();
    const roots = Array.isArray(targetNames) ? targetNames.slice() : [String(targetNames || "")];

    function dfs(name) {
        if (visited.has(name)) return;
        visited.add(name);

        const node = merged[name];
        if (!node) return;

        const deps = Array.isArray(node.dependencies) ? node.dependencies : [];
        const externals = Array.isArray(node.external_dependencies) ? node.external_dependencies : [];

        for (const dep of [...deps, ...externals]) {
            dfs(dep);
        }
    }

    for (const root of roots) {
        if (typeof root === "string" && root) dfs(root);
    }

    // 3) return everything, including roots
    return Array.from(visited);
}

export function filterNamesInJsons(dataJsonList, names) {
    const merged = {};

    // Merge all JSON objects (later wins)
    for (const s of dataJsonList || []) {
        if (typeof s !== "string") continue;
        try {
            const obj = JSON.parse(s);
            if (obj && typeof obj === "object" && !Array.isArray(obj)) {
                for (const k of Object.keys(obj)) {
                    merged[k] = { ...(merged[k] || {}), ...obj[k] };
                }
            }
        } catch {
            // ignore invalid JSON
        }
    }

    const results = [];
    for (const n of names || []) {
        if (n in merged) {
            results.push({
                name: n,
                version: parseVersion(merged[n]?.version),
            });
        }
    }
    return results;
}

/* ---- bundle catalog ---- */

// Iterate every (libName, manifestObj, bundle) entry across the downloaded bundle
// catalogs (parsed bundle JSON). Skips bundles whose JSON isn't downloaded yet or
// fails to parse.
export function forEachCatalogEntry(bundles, fn) {
    for (const bundle of bundles || []) {
        const txt = bundle.json.getText();
        if (!txt) continue;
        let obj;
        try {
            obj = JSON.parse(txt);
        } catch {
            continue;
        }
        for (const name of Object.keys(obj)) {
            fn(name, obj[name], bundle);
        }
    }
}

export function isBundleJsonFileName(str) {
    const pattern = /^.+-\d{8}\.json$/;
    return pattern.test(str);
}

export async function fetchBundleAssets(repo) {
    const response = await fetch(`https://api.github.com/repos/adafruit/${repo}/releases/latest`);
    const data = await response.json();

    return data.assets;
}

export function getBundleTimeStamp(assets) {
    return assets.at(0).updated_at;
}

// The CircuitPython major a bundle zip is built for, read from its file name
// (e.g. "adafruit-circuitpython-bundle-9.x-mpy-20260712.zip" -> 9), or null when
// the name is not a versioned bundle zip.
export function parseBundleZipVersion(fileName) {
    const match = String(fileName || "").match(/^.+-(\d+)\.x-mpy-.*\.zip$/);
    return match ? parseInt(match[1], 10) : null;
}

export function extractBundleUrls(assets) {
    const result = [];

    for (const asset of assets) {
        const version = parseBundleZipVersion(asset.name);
        if (version !== null) {
            result.push({ version, url: asset.browser_download_url });
        }
    }

    return result;
}

// Re-exported for existing import sites; the single source of truth is sleep.js.
export { sleep } from "./sleep";
