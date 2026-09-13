import { harness } from "./helpers/harness.js";
import { renderHook, flushEffects } from "./helpers/renderHook.js";
import useEditorCommands from "../src/hooks/useEditorCommands";
import useBackupJob from "../src/hooks/useBackupJob";
import useDebugTargets from "../src/hooks/useDebugTargets";
import useMomentaryButton from "../src/hooks/useMomentaryButton";
const t = harness("review lifecycle regressions");
t.watch();
const previousAlert = globalThis.alert;
const previousWarn = console.warn;
const hooks = [];
const mount = (callback) => { const hook = renderHook(callback); hooks.push(hook); return hook; };
try {
    const editor = () => ({ commands: { entries: new Map(),
        addCommand(command) { this.entries.set(command.name, command); },
        removeCommand(name) { this.entries.delete(name); },
    } });
    let saved;
    const actions = { current: { text: "original", saveFile: (value) => { saved = value; } } };
    const commands = mount((instance) => useEditorCommands(instance, actions));
    commands.render(null);
    const docked = editor(); commands.render(docked);
    t.check("late ACE mount installs shortcuts", docked.commands.entries.size === 8);
    actions.current = { text: "edited", saveFile: (value) => { saved = value; } };
    docked.commands.entries.get("save").exec();
    t.check("save shortcut uses current text", saved === "edited");
    const popup = editor(); commands.render(popup);
    t.check("pop-out replacement gets all shortcuts", popup.commands.entries.size === 8 && docked.commands.entries.size === 0);
    const redocked = editor(); commands.render(redocked);
    t.check("docking again rebinds to the replacement", redocked.commands.entries.size === 8 && popup.commands.entries.size === 0);
    commands.unmount();
    t.check("unmount removes installed commands", redocked.commands.entries.size === 0);

    const alerts = []; const warnings = [];
    globalThis.alert = (text) => alerts.push(text);
    console.warn = (text) => warnings.push(text);
    const jobs = mount(() => useBackupJob());
    const failure = async () => { throw new Error("drive unavailable"); };
    await jobs.render().runJob(failure, { background: true });
    await jobs.render().runJob(failure, { background: true });
    t.check("recurring scheduled errors never alert", alerts.length === 0 && warnings.length === 2);
    t.check("scheduled failure is available for status display", jobs.render().error.includes("drive unavailable"));
    await jobs.render().runJob(failure);
    t.check("manual failure still alerts", alerts.length === 1);
    let finish;
    const first = jobs.render().runJob(() => new Promise((resolve) => { finish = resolve; }));
    let overlapped = false;
    await jobs.render().runJob(async () => { overlapped = true; });
    finish(); await first;
    t.check("busy jobs do not overlap and success clears status", !overlapped && jobs.render().error === null);

    let resets = 0;
    const reset = () => { resets++; };
    const root = (id) => ({ id, isSameEntry: async (other) => other.id === id });
    let list = async (handle) => [handle.id + ".py"];
    const targets = mount(({ handle, ready }) => useDebugTargets(handle, ready, list, reset));
    const board = root("one");
    targets.render({ handle: board, ready: true }); await flushEffects();
    t.check("initial source loads debug files", targets.render().files[0] === "one.py" && resets === 1);
    targets.render({ handle: board, ready: false });
    targets.render({ handle: board, ready: true }); await flushEffects();
    t.check("health blip preserves debug session", resets === 1);
    targets.render({ handle: root("one"), ready: true }); await flushEffects();
    t.check("equivalent native handle preserves session", resets === 1);
    targets.render({ handle: root("two"), ready: true }); await flushEffects();
    t.check("different board resets session deliberately", resets === 2 && targets.render().files[0] === "two.py");
    let stale;
    list = (handle) => handle.id === "slow" ? new Promise((resolve) => { stale = resolve; }) : Promise.resolve([handle.id + ".py"]);
    targets.render({ handle: root("slow"), ready: true }); await flushEffects();
    targets.render({ handle: root("three"), ready: true }); await flushEffects();
    stale(["stale.py"]); await flushEffects();
    t.check("late listing cannot overwrite new board", targets.render().files[0] === "three.py");

    const writes = [];
    const send = (name, value) => writes.push([name, value]);
    const button = mount((name) => useMomentaryButton(name, send));
    button.render("motor").onBlur();
    t.check("focus traversal sends no board writes", writes.length === 0);
    const key = { key: " ", repeat: false, preventDefault() {} };
    button.render().onKeyDown(key); button.render().onKeyDown({ ...key, repeat: true });
    button.render().onBlur(); button.render().onKeyUp(key);
    t.check("keyboard press and lost focus send exactly one release", JSON.stringify(writes) === '[["motor",true],["motor",false]]');
    writes.length = 0;
    button.render().onPointerDown({ button: 0, isPrimary: true, pointerId: 1, currentTarget: { setPointerCapture() {} } });
    button.render().onPointerCancel(); button.render().onLostPointerCapture();
    t.check("pointer cancellation does not duplicate release", JSON.stringify(writes) === '[["motor",true],["motor",false]]');
    writes.length = 0;
    button.render().onKeyDown(key); button.render("other");
    t.check("variable change releases the variable actually pressed", JSON.stringify(writes) === '[["motor",true],["motor",false]]');
} catch (error) { t.fail("unexpected error", error); }
finally { hooks.forEach((hook) => hook.unmount()); globalThis.alert = previousAlert; console.warn = previousWarn; }
t.done();
