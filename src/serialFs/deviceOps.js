// The Python we inject over raw REPL, plus the parsing of what comes back.
//
// Everything here is written to the lowest common denominator that both
// CircuitPython and MicroPython understand, so this file is reusable as-is when
// MicroPython support lands. Two rules keep it that way:
//
//   * Never use os.ilistdir(). CircuitPython does not have it, which is exactly
//     why pyboard.py's and mpremote's fs_ls fail there. Use os.listdir() +
//     os.stat() and test the directory bit as st_mode & 0x4000.
//   * Never assume binascii exists. It is a FULL_BUILD-only module, so small
//     SAMD21-class boards ship without it. We probe that the function actually
//     works rather than just that the import succeeded, then fall back to pure
//     Python. Adafruit's FileOps hard-imports it and simply breaks on those boards.

import { reprStr, reprBytes, toHex, fromHex } from "./pythonRepr";

// Raw bytes per exec when writing. ViperIDE uses 128; the whole command is
// buffered on the device before it compiles, so bigger chunks risk running a
// small board out of memory.
const WRITE_CHUNK_BYTES = 128;

// Hex encoder with a pure-Python fallback, shared by the read and write paths.
// The `h(b'')` / `u('')` probe call is deliberate: on some builds the import
// succeeds but the function is unusable.
const HEXLIFY_PREAMBLE = `try:
 import binascii
 h=lambda x: binascii.hexlify(x).decode()
 h(b'')
except:
 h=lambda b: ''.join('{:02x}'.format(c) for c in b)
`;

const UNHEXLIFY_PREAMBLE = `try:
 import binascii
 u=binascii.unhexlify
 u('')
except:
 u=lambda s: bytes(int(s[i:i+2],16) for i in range(0,len(s),2))
`;

/** Normalise an IDE path to an absolute device path. "" and "/" mean the root. */
export function devicePath(path) {
    const parts = String(path || "")
        .replace(/\\/g, "/")
        .split("/")
        .filter(Boolean);
    return parts.length ? "/" + parts.join("/") : "";
}

/** Join a parent device path and a child name. */
export function joinPath(parent, name) {
    return (parent === "/" ? "" : parent) + "/" + name;
}

/**
 * List the entire tree in one round trip.
 *
 * One exec for the whole tree rather than one per directory, because each exec
 * costs a Ctrl-C that interrupts whatever the board is running.
 *
 * @returns {Promise<Array<{type: "f"|"d", path: string, size: number}>>}
 */
export async function walk(session) {
    // The path is hex-encoded rather than printed raw. A filename may legally
    // contain a space, a newline, or the separator itself, and any of those
    // would corrupt or split a plain-text line. Hex contains no whitespace, so
    // trimming line endings stays safe.
    const code = `${HEXLIFY_PREAMBLE}import os
def w(p):
 try: es=os.listdir(p if p else '/')
 except: return
 for n in es:
  fn=p+'/'+n
  try: s=os.stat(fn)
  except: continue
  if s[0] & 0x4000:
   print('d|0|'+h(fn.encode()))
   w(fn)
  else:
   print('f|'+str(s[6])+'|'+h(fn.encode()))
w('')`;
    const out = await session.exec(code, 30000);
    const decoder = new TextDecoder();
    const entries = [];
    for (const line of out.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const parts = trimmed.split("|");
        if (parts.length !== 3) continue;
        const [type, size, hexPath] = parts;
        if (type !== "f" && type !== "d") continue;
        if (!/^[0-9a-fA-F]*$/.test(hexPath)) continue;
        entries.push({
            type,
            path: decoder.decode(fromHex(hexPath)),
            size: parseInt(size, 10) || 0,
        });
    }
    return entries;
}

/**
 * Read a file's bytes.
 *
 * The device chunks at 64 bytes and streams hex, so memory use stays flat
 * regardless of file size.
 */
export async function readFile(session, path) {
    const p = devicePath(path);
    const code = `${HEXLIFY_PREAMBLE}with open(${reprStr(p)},'rb') as f:
 while 1:
  b=f.read(64)
  if not b:break
  print(h(b),end='')`;
    const out = await session.exec(code, 60000, p);
    return fromHex(out);
}

/**
 * Write bytes to a file.
 *
 * Writes to a temp file and renames into place, so an interrupted transfer
 * cannot leave a half-written code.py behind. Each chunk is sent as whichever of
 * hex or a Python bytes literal is shorter: printable ASCII costs 1 char per
 * byte as a literal versus 2 as hex, while binary costs 4.
 */
export async function writeFile(session, path, bytes) {
    const p = devicePath(path);
    const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    const parent = p.slice(0, p.lastIndexOf("/"));
    const tmp = (parent || "") + "/.ide-tmp";

    await session.exec(`${UNHEXLIFY_PREAMBLE}import os
f=open(${reprStr(tmp)},'wb')
w=lambda d: f.write(u(d))
o=f.write`, 15000, p);

    // From here on the device holds an open handle and a temp file, so any
    // failure has to clean both up. The target file is atomic either way (it is
    // only touched by the final rename), but without this the board keeps a
    // stray .ide-tmp holding disk space after a failed save.
    try {
        for (let i = 0; i < data.length; i += WRITE_CHUNK_BYTES) {
            const chunk = data.subarray(i, i + WRITE_CHUNK_BYTES);
            const asHex = `w('${toHex(chunk)}')`;
            const asRepr = `o(${reprBytes(chunk)})`;
            await session.exec(asHex.length <= asRepr.length ? asHex : asRepr, 15000, p);
        }

        // Remove first: os.rename refuses to clobber on some ports.
        await session.exec(`f.close()
try: os.remove(${reprStr(p)})
except: pass
os.rename(${reprStr(tmp)},${reprStr(p)})`, 15000, p);
    } catch (error) {
        try {
            await session.exec(`try: f.close()
except: pass
try:
 import os
 os.remove(${reprStr(tmp)})
except: pass`, 15000, p);
        } catch {
            // Cleanup is best-effort: if the board is gone or wedged this will
            // fail too, and surfacing that instead of the real error would hide
            // why the save failed.
        }
        throw error;
    }
}

/** mkdir -p. Tolerates EEXIST (17) and a wasm-port ENOTDIR (20) quirk. */
export async function mkdirp(session, path) {
    const p = devicePath(path);
    if (!p) return;
    await session.exec(`import os
q=''
for d in ${reprStr(p)}.split('/'):
 if not d: continue
 q+='/'+d
 try: os.mkdir(q)
 except OSError as e:
  if e.args[0] not in (17,20): raise`, 15000, p);
}

/** Delete a file, or a directory and everything under it. */
export async function remove(session, path) {
    const p = devicePath(path);
    if (!p) throw new Error("Refusing to delete the device root");
    await session.exec(`import os
def r(p):
 try: s=os.stat(p)
 except OSError: return
 if s[0] & 0x4000:
  for n in os.listdir(p):
   r(p+'/'+n)
  os.rmdir(p)
 else:
  os.remove(p)
r(${reprStr(p)})`, 30000, p);
}

/**
 * Ensure a file exists, WITHOUT touching one that already does.
 *
 * Append mode is load-bearing here. `'wb'` would truncate, and the File System
 * Access API requires getFileHandle({create:true}) to be non-destructive for an
 * existing file. Callers rely on that: path2Handles() defaults to create:true,
 * so a plain read of boot.py would otherwise zero it. pyboard.py's fs_touch uses
 * append for the same reason.
 */
export async function touch(session, path) {
    const p = devicePath(path);
    // Report the resulting size in the same round trip, so a caller that hit a
    // cache miss on a file the board already had records its real size rather
    // than assuming 0.
    const out = await session.exec(`import os
f=open(${reprStr(p)},'ab')
f.close()
print(os.stat(${reprStr(p)})[6])`, 15000, p);
    return parseInt(out.trim(), 10) || 0;
}
