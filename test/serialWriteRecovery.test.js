// @requires python3
import { harness } from "./helpers/harness.js";
import { startFakeDevice } from "./helpers/fakeDevice.js";
import * as ops from "../src/serialFs/deviceOps";
const t = harness("serial writes retain the original through failed replacement");
t.watch();
const decoder = new TextDecoder();
const device = startFakeDevice({ "code.py": "original", ".ide-tmp": "user temporary file", ".ide-old": "older recovery" });
const read = async (name) => decoder.decode(await ops.readFile(device.session, name));
try {
    await device.session.exec(`import os
_real_rename=os.rename
def fail_install(a,b):
 if a.startswith('/.ide-tmp') and b == '/code.py': raise OSError(5,'rename failed')
 return _real_rename(a,b)
os.rename=fail_install`);
    try { await ops.writeFile(device.session, "code.py", new TextEncoder().encode("new")); t.check("replacement fails", false); }
    catch { t.check("replacement failure propagates", true); }
    t.check("failed replacement restores the original path", await read("code.py") === "original");
    t.check("existing temporary file is never truncated", await read(".ide-tmp") === "user temporary file");
    t.check("existing recovery file is never overwritten", await read(".ide-old") === "older recovery");
    t.check("owned temporary files are cleaned", device.listRoot().every((name) => !name.startsWith(".ide-tmp-")));
    await device.session.exec(`def fail_both(a,b):
 if b == '/code.py': raise OSError(5,'rename failed')
 return _real_rename(a,b)
os.rename=fail_both`);
    try { await ops.writeFile(device.session, "code.py", new TextEncoder().encode("new")); t.check("rollback fails", false); }
    catch (error) { t.check("failed rollback reports recovery location", error.message.includes("/.ide-old-1")); }
    t.check("failed rollback keeps the recovery bytes", await read(".ide-old-1") === "original");
    await device.session.exec("os.rename=_real_rename");
    await ops.writeFile(device.session, ".ide-tmp", new TextEncoder().encode("new temp contents"));
    t.check("saving a file named like our temporary file works", await read(".ide-tmp") === "new temp contents");
    t.check("a previous failed-write recovery survives later saves", await read(".ide-old-1") === "original");
    for (const name of ["..", ".", "a/b", "a\\b", "\0", ""]) {
        try { ops.joinPath("/lib", name); t.check(`invalid child name ${JSON.stringify(name)}`, false); }
        catch { t.check(`invalid child name ${JSON.stringify(name)} rejected`, true); }
    }
} catch (error) { t.fail("unexpected error", error); }
finally { device.stop(); }
t.done();
