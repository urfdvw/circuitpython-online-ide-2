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
                const m = line.match(/^from\s+([a-zA-Z_][\w\.]*)\s+import/);
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
    // console.log(name);

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
        console.log("Extracted metadata:", result);
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
    const m = /(\d+\.\d+\.\d+)\x00/.exec(text);
    return m ? m[1] : null;
}

function parseVersion(versionStr) {
    const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(versionStr.trim());
    if (!m) {
        return { major: null, minor: null, patch: null, raw: versionStr };
    }
    return {
        major: Number(m[1]),
        minor: Number(m[2]),
        patch: Number(m[3]),
    };
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

    function parseVersion(v) {
        // Accept both string "1.2.3" and object {major, minor, patch}
        if (v && typeof v === "object") {
            const { major = null, minor = null, patch = null } = v;
            return {
                major: Number.isFinite(+major) ? +major : null,
                minor: Number.isFinite(+minor) ? +minor : null,
                patch: Number.isFinite(+patch) ? +patch : null,
            };
        }
        if (typeof v === "string") {
            // match v1.2.3, 1.2.3, 1.2, 1
            const m = v.trim().match(/^v?\s*(\d+)(?:\.(\d+))?(?:\.(\d+))?/i);
            if (m) {
                return {
                    major: parseInt(m[1], 10),
                    minor: m[2] !== undefined ? parseInt(m[2], 10) : 0,
                    patch: m[3] !== undefined ? parseInt(m[3], 10) : 0,
                };
            }
        }
        // Unparseable or missing
        return { major: null, minor: null, patch: null };
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

export function compareVersions(a, b) {
    const toNums = (v) => [v?.major ?? 0, v?.minor ?? 0, v?.patch ?? 0];

    const [aMaj, aMin, aPat] = toNums(a);
    const [bMaj, bMin, bPat] = toNums(b);

    if (aMaj !== bMaj) return aMaj < bMaj ? -1 : 1;
    if (aMin !== bMin) return aMin < bMin ? -1 : 1;
    if (aPat !== bPat) return aPat < bPat ? -1 : 1;
    return 0;
}

export function versionToString(v) {
    if (!v || typeof v !== "object") return "";
    const major = v.major ?? 0;
    const minor = v.minor ?? 0;
    const patch = v.patch ?? 0;
    return `${major}.${minor}.${patch}`;
}
