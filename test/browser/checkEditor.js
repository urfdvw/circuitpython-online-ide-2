// Runs inside the real browser page through the CDP runner.
export async function checkEditor() {
    const checks = [];
    const check = (name, ok) => { if (!ok) throw new Error(name); checks.push(name); };
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const until = async (predicate) => {
        for (let attempt = 0; attempt < 100; attempt++) {
            if (predicate()) return;
            await wait(50);
        }
        throw new Error("Timed out waiting for the editor lifecycle.");
    };
    const getEditor = (doc) => doc.querySelector(".ace_editor")?.env?.editor;
    const menuButton = (doc) => [...doc.querySelectorAll("button")].find((element) => element.textContent.trim() === "≡");
    const menuItem = (doc, label) => [...doc.querySelectorAll('[role="menuitem"]')].find((element) => element.textContent.trim() === label);
    const commands = ["save", "run_current", "run_current_and_del", "run_cell", "ctrl-c", "ctrl-d"];
    await until(() => window.editorReview && getEditor(document)?.getValue().includes("original"));
    const state = window.editorReview;
    const first = getEditor(document);
    check("initial editor mounted", !!first);
    first.setValue('print("edited")\n', -1);
    await wait(100); first.execCommand("save");
    await until(() => state.saved.at(-1) === 'print("edited")\n');
    // Drive pacing also keeps the save lock held until close has settled.
    await wait(250);
    check("initial shortcut saves latest text", true);
    menuButton(document).click(); await until(() => menuItem(document, "Pop Up"));
    menuItem(document, "Pop Up").click();
    await until(() => state.popup && getEditor(state.popup.document)?.commands.commands.save);
    const second = getEditor(state.popup.document);
    check("popup editor remounted", second !== first);
    check("popup shortcuts installed", commands.every((name) => second.commands.commands[name]));
    check("popup preserves edited text", second.getValue() === 'print("edited")\n');
    check("popup has breakpoint stylesheet", !!state.popup.document.getElementById("breakpoint-styles"));
    second.setValue('print("popup")\n', -1); await wait(100); second.execCommand("save");
    await until(() => state.saved.at(-1) === 'print("popup")\n'); await wait(250);
    check("popup shortcut saves latest text", true);
    menuButton(state.popup.document).click();
    await until(() => menuItem(state.popup.document, "Dock") || menuItem(document, "Dock"));
    const dock = menuItem(state.popup.document, "Dock") || menuItem(document, "Dock");
    check("dock menu available", !!dock); dock.click();
    await until(() => getEditor(document)?.commands.commands.save);
    const third = getEditor(document);
    check("docked editor remounted again", third !== second && third !== first);
    check("docked shortcuts installed", commands.every((name) => third.commands.commands[name]));
    check("docking preserves popup edits", third.getValue() === 'print("popup")\n');
    const saves = state.saved.length; third.execCommand("save");
    await until(() => state.saved.length > saves); await wait(250);
    check("docked shortcut saves", state.saved.at(-1) === 'print("popup")\n');
    const cell = third.renderer.$gutterLayer.element.querySelector(".ace_gutter-cell");
    const rect = cell.getBoundingClientRect();
    cell.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: rect.left + 1, clientY: rect.top + 2 }));
    await until(() => third.getValue().includes("# ●"));
    check("docked gutter listener sets a breakpoint", true);
    check("no runtime errors", state.errors.length === 0);
    return { checks, saved: state.saved, errors: state.errors };
}
