/**
 * Single source of truth for semantic-version handling across the IDE.
 *
 * A version is represented as { major, minor, patch } (integers), or
 * { major: null, minor: null, patch: null } when it can't be parsed.
 */

/**
 * Lenient parse: accepts an existing version object or a string.
 *  - object  -> coerced to integer fields (non-numeric parts become null)
 *  - string  -> matches "1.2.3", "v1.2", "1", etc.; missing parts default to 0
 *  - anything unparseable -> { major: null, minor: null, patch: null }
 *
 * Installed .py/.mpy versions are always full "X.Y.Z"; bundle JSON versions may
 * be partial, so the lenient behavior is required and safe for every caller.
 */
export function parseVersion(v) {
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
    return { major: null, minor: null, patch: null };
}

/**
 * Compare two versions. Returns -1 (a < b), 0 (equal), or 1 (a > b).
 * Missing/null fields are treated as 0.
 */
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
