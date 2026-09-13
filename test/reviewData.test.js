import { harness } from "./helpers/harness.js";
import { renderHook } from "./helpers/renderHook.js";
import useConfig from "../src/utilComponents/react-user-config/useConfig";
import schemas from "../src/configs";
import { compareFolders } from "../src/utilComponents/react-local-file-system/utilities/fileSystemUtils";
const t = harness("partial comparisons and cross-tab settings");
t.watch();
const originalWindow = globalThis.window;
const originalStorage = globalThis.localStorage;
const originalWarn = console.warn;
const hooks = [];
try {
    let stored = null; let blocked = false;
    const listeners = new Set();
    globalThis.localStorage = {
        getItem: () => stored,
        setItem: (key, value) => { if (blocked) throw new Error("Quota exceeded"); stored = value; },
    };
    globalThis.window = { addEventListener: (name, callback) => listeners.add(callback), removeEventListener: (name, callback) => listeners.delete(callback) };
    console.warn = () => {};
    const a = renderHook(() => useConfig(schemas)); const b = renderHook(() => useConfig(schemas)); hooks.push(a, b);
    a.render(); b.render();
    a.render().setConfigField("general", "theme", "dark");
    b.render().setConfigField("serial_console", "font", 16);
    t.check("stale tab preserves another tab's section", JSON.parse(stored).general.theme === "dark");
    a.render().setConfigField("editor", "font", 17);
    b.render().setConfigField("editor", "live_autocompletion", false);
    t.check("stale tab preserves another field in the same section", JSON.parse(stored).editor.font === 17);
    listeners.forEach((fn) => fn({ key: "config", storageArea: localStorage }));
    t.check("storage events refresh existing tab UI", a.render().config.editor.live_autocompletion === false && b.render().config.editor.font === 17);
    blocked = true;
    a.render().setConfigField("editor", "font", 18);
    a.render().setConfigField("general", "theme", "light");
    t.check("consecutive failed writes retain both session updates", a.render().config.editor.font === 18 && a.render().config.general.theme === "light");
    blocked = false;
    b.render().setConfigField("serial_console", "font", 19);
    listeners.forEach((fn) => fn({ key: "config" }));
    t.check("external update preserves pending local changes", a.render().config.editor.font === 18 && a.render().config.serial_console.font === 19);
    a.render().setConfigField("editor", "newline_mode", "unix");
    t.check("recovered persistence merges pending and external changes", JSON.parse(stored).editor.font === 18 && JSON.parse(stored).serial_console.font === 19);
    hooks.forEach((hook) => hook.unmount());
    t.check("storage listeners are removed on unmount", listeners.size === 0);

    const file = (name, text, fail = false) => ({ kind: "file", name, async getFile() {
        if (fail) throw new Error("Permission denied");
        return { text: async () => text };
    } });
    const folder = (name, children, fail = false) => ({ kind: "directory", name, async *values() {
        if (fail) throw new Error("Directory inaccessible");
        for (const child of children) yield child;
    } });
    const source = folder("source", [file("bad.py", "", true), file("good.py", "old"),
        folder("private", [], true), file("only-source.py", "new")]);
    const target = folder("target", [file("bad.py", "existing"), file("good.py", "new"),
        folder("private", [file("nested.py", "keep")]), file("only-target.py", "old")]);
    const diff = await compareFolders(source, target);
    t.check("unreadable files do not prevent other comparisons", diff.editedFiles.length === 1 && diff.editedFiles[0].path === "/good.py");
    t.check("file and directory failures are reported explicitly", !diff.complete && diff.unreadable.length === 2);
    t.check("unknown paths are not misreported as added or removed", diff.newFiles.length === 1 && diff.newFiles[0].path === "/only-source.py" && diff.removedFiles.length === 1 && diff.removedFiles[0].path === "/only-target.py");
    const unreadableRoot = await compareFolders(folder("root", [], true), target);
    t.check("failed root enumeration cannot imply a whole-tree deletion", !unreadableRoot.complete && unreadableRoot.removedFiles.length === 0);
    const complete = await compareFolders(target, target);
    t.check("readable comparisons report completeness", complete.complete && complete.unreadable.length === 0 && complete.editedFiles.length === 0);
} catch (error) { t.fail("unexpected error", error); }
finally { hooks.forEach((hook) => hook.unmount()); globalThis.window = originalWindow; globalThis.localStorage = originalStorage; console.warn = originalWarn; }
t.done();
