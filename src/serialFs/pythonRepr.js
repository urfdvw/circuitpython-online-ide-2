// Python repr() for the strings and byte payloads that get interpolated into
// injected device code.
//
// pyboard.py interpolates paths with a bare '%s', which breaks on any filename
// containing a quote or a backslash. ViperIDE quotes properly; so do we. Every
// path and every payload that crosses the wire goes through here.
//
// Everything is escaped down to 7-bit ASCII on purpose: the raw REPL carries the
// command as source text, and we never want to depend on the device decoding
// UTF-8 in a source line.
//
// This is therefore NOT byte-identical to CPython's repr(), which leaves
// printable non-ASCII alone. The escapes it produces are the same ones, just
// applied more aggressively.
//
// The \u / \U forms need MICROPY_PY_BUILTINS_STR_UNICODE. CircuitPython sets it
// unconditionally (py/circuitpy_mpconfig.h), so this is safe on every board the
// IDE supports today. MicroPython makes it depend on the build's ROM level, so a
// minimal MicroPython port could take these literally and open the wrong path.
// Revisit when MicroPython support lands; see dev logs/serial file system roadmap.md.

const SIMPLE_ESCAPES = {
    "\\": "\\\\",
    "\n": "\\n",
    "\r": "\\r",
    "\t": "\\t",
};

function escapeCodePoint(code) {
    if (code <= 0xff) {
        return "\\x" + code.toString(16).padStart(2, "0");
    }
    if (code <= 0xffff) {
        return "\\u" + code.toString(16).padStart(4, "0");
    }
    return "\\U" + code.toString(16).padStart(8, "0");
}

/**
 * Quote a JS string as a Python `str` literal, the way CPython's repr() would.
 *
 * @param {string} s
 * @returns {string} e.g. `'code.py'`, `"it's"`, `'a\\\\b'`
 */
export function reprStr(s) {
    const str = String(s === null || s === undefined ? "" : s);
    // repr() prefers single quotes, switching to double only when that avoids escaping.
    const quote = str.includes("'") && !str.includes('"') ? '"' : "'";
    let out = quote;
    // Iterate by code point so astral characters (emoji) escape as one \U escape.
    for (const ch of str) {
        if (ch === quote) {
            out += "\\" + ch;
            continue;
        }
        if (SIMPLE_ESCAPES[ch]) {
            out += SIMPLE_ESCAPES[ch];
            continue;
        }
        const code = ch.codePointAt(0);
        // Printable ASCII passes through; everything else is escaped.
        out += code >= 0x20 && code < 0x7f ? ch : escapeCodePoint(code);
    }
    return out + quote;
}

/**
 * Quote bytes as a Python `bytes` literal.
 *
 * Used by the writer to compare against a hex-encoded form and send whichever is
 * shorter: printable ASCII costs 1 char per byte here versus 2 as hex, while
 * binary costs 4.
 *
 * @param {Uint8Array} bytes
 * @returns {string} e.g. `b'print(1)\\n'`
 */
export function reprBytes(bytes) {
    let out = "b'";
    for (const byte of bytes) {
        if (byte === 0x27) {
            out += "\\'";
        } else if (byte === 0x5c) {
            out += "\\\\";
        } else if (byte === 0x0a) {
            out += "\\n";
        } else if (byte === 0x0d) {
            out += "\\r";
        } else if (byte === 0x09) {
            out += "\\t";
        } else if (byte >= 0x20 && byte < 0x7f) {
            out += String.fromCharCode(byte);
        } else {
            out += "\\x" + byte.toString(16).padStart(2, "0");
        }
    }
    return out + "'";
}

/** Hex-encode bytes for the `unhexlify` path. Always 2 chars per byte. */
export function toHex(bytes) {
    let out = "";
    for (const byte of bytes) {
        out += byte.toString(16).padStart(2, "0");
    }
    return out;
}

/** Decode the hex string a device read returns. Ignores whitespace. */
export function fromHex(hex) {
    const clean = String(hex).replace(/\s+/g, "");
    const out = new Uint8Array(clean.length >> 1);
    for (let i = 0; i < out.length; i++) {
        out[i] = parseInt(clean.substr(i * 2, 2), 16);
    }
    return out;
}
