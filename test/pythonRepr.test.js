// @requires python3
// Quoting and byte encoding, cross-checked against a real Python.
//
// A mistake here corrupts files silently rather than failing loudly, and the
// device may use either binascii or the pure-Python fallback, so both must agree
// with what JavaScript produced.

import { execFileSync } from "node:child_process";
import { harness } from "./helpers/harness.js";
import { reprStr, reprBytes, toHex, fromHex } from "../src/serialFs/pythonRepr";
import * as ops from "../src/serialFs/deviceOps";

const t = harness("python quoting and encoding");
t.watch();

/** Run a snippet in real Python and return its stdout. */
const python = (code) => execFileSync("python3", ["-c", code], { encoding: "utf8" });

try {
    // ---- quoting survives a Python round trip ----
    const strings = ["code.py", "it's", 'say "hi"', `it's a "quote"`, "a\\b", "tab\there", "nl\nhere", "hi \u{1F40D}", "  padded  "];
    const script = strings.map((s) => `print(repr(${reprStr(s)}))`).join("\n");
    const back = python(script).trim().split("\n");
    let allMatch = true;
    for (let i = 0; i < strings.length; i++) {
        // Compare by value: our escaping is deliberately more aggressive than
        // CPython's repr(), so the literals differ while the strings must not.
        const decoded = python(`import sys; sys.stdout.write(${reprStr(strings[i])})`);
        if (decoded !== strings[i]) {
            allMatch = false;
            t.check(`quoting round trip: ${JSON.stringify(strings[i])}`, false, JSON.stringify(decoded));
        }
    }
    t.check("every string survives a Python round trip", allMatch, `${strings.length} cases, ${back.length} printed`);

    // ---- byte encodings agree with both device implementations ----
    const cases = {
        "all 256 byte values": new Uint8Array(256).map((_, i) => i),
        "quote/backslash/newline/nul": new Uint8Array([0x27, 0x5c, 0x0a, 0x0d, 0x09, 0x00, 0xff, 0x22]),
        "python source text": new TextEncoder().encode("print('hi')\n\t\\ \"q\" \u{1F40D}"),
    };
    for (const [name, bytes] of Object.entries(cases)) {
        const hex = toHex(bytes);
        const literal = reprBytes(bytes);
        const expected = Array.from(bytes).join(",");

        // JS-side round trip.
        const roundTripped = fromHex(hex);
        t.check(
            `${name}: JS hex round trip`,
            roundTripped.length === bytes.length && roundTripped.every((b, i) => b === bytes[i])
        );

        // Both device-side decoders must reproduce the bytes from our hex, and
        // both encoders must reproduce our hex from the bytes.
        const out = python(
            [
                "import binascii",
                "h_fb=lambda b: ''.join('{:02x}'.format(c) for c in b)",
                "u_fb=lambda s: bytes(int(s[i:i+2],16) for i in range(0,len(s),2))",
                `hexed=${JSON.stringify(hex)}`,
                `lit=${literal}`,
                "orig=u_fb(hexed)",
                "print(','.join(str(c) for c in orig))",
                "print(','.join(str(c) for c in binascii.unhexlify(hexed)))",
                "print(h_fb(orig))",
                "print(binascii.hexlify(orig).decode())",
                "print(','.join(str(c) for c in lit))",
            ].join("\n")
        ).trim().split("\n");

        t.check(`${name}: pure-Python unhexlify`, out[0] === expected);
        t.check(`${name}: binascii unhexlify`, out[1] === expected);
        t.check(`${name}: pure-Python hexlify matches JS`, out[2] === hex);
        t.check(`${name}: binascii hexlify matches JS`, out[3] === hex);
        t.check(`${name}: bytes literal evaluates back`, out[4] === expected);
    }

    // ---- every injected snippet is valid Python ----
    const captured = [];
    const recorder = {
        exec: async (code) => {
            captured.push(code);
            return "";
        },
    };
    const encoder = new TextEncoder();
    await ops.walk(recorder);
    await ops.readFile(recorder, "lib/foo.py");
    await ops.writeFile(recorder, "code.py", encoder.encode("print('hi')\n"));
    await ops.writeFile(recorder, "d/bin.mpy", new Uint8Array([0, 1, 2, 255, 0x27, 0x5c]));
    await ops.mkdirp(recorder, "/a/b/c");
    await ops.remove(recorder, "lib/old");
    await ops.touch(recorder, "new.py");
    await ops.readFile(recorder, "it's/a\\b/\u{1F40D}.py");

    const check = python(
        [
            "import json,sys",
            `snips=json.loads(sys.stdin.read()) if False else ${JSON.stringify(JSON.stringify(captured))}`,
            "snips=json.loads(snips)",
            "bad=0",
            "for i,s in enumerate(snips):",
            "    try: compile(s,'<snippet %d>'%i,'exec')",
            "    except SyntaxError as e:",
            "        bad+=1; print('SYNTAX ERROR',i,e)",
            "print('checked',len(snips),'bad',bad)",
        ].join("\n")
    ).trim();
    const m = check.match(/checked (\d+) bad (\d+)/);
    t.check("every injected snippet compiles", m && m[2] === "0", check);
    t.check("and there were snippets to check", m && Number(m[1]) > 8, m ? m[1] : "?");
} catch (error) {
    t.fail("unexpected error", error);
}

t.done();
