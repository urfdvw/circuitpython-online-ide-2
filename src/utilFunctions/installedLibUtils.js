const BAD_FILE_FORMAT = "BAD_FILE_FORMAT";

export async function extractLibFileMetadata(handle) {
    if (!handle) {
        throw new Error("File handle is required");
    }

    const name = handle.name;
    console.log(name);

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

/* ---------- helpers ---------- */
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
