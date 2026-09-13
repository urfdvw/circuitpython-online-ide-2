import { useEffect } from "react";

export default function useEditorCommands(editorInstance, commandActions) {
    // Each ACE instance needs its own bindings, including pop-out and dock replacements.
    useEffect(() => {
        if (!editorInstance) return;
        const commands = editorInstance.commands;
        commands.addCommand({
            name: "save",
            bindKey: { win: "Ctrl-S", mac: "Command-S" },
            exec: () => commandActions.current.saveFile(commandActions.current.text),
        });
        commands.addCommand({
            name: "ctrl-c",
            bindKey: { win: "Ctrl-Shift-C", mac: "Ctrl-C" },
            exec: () => commandActions.current.sendCtrlC(),
        });
        commands.addCommand({
            name: "ctrl-d",
            bindKey: { win: "Ctrl-Shift-D", mac: "Ctrl-D" },
            exec: () => commandActions.current.sendCtrlD(),
        });
        commands.addCommand({
            name: "run_current",
            bindKey: { win: "Shift-Enter", mac: "Shift-Enter" },
            exec: function (editor) {
                console.log("run_current");
                commandActions.current.run_current(editor);
            },
        });
        commands.addCommand({
            name: "run_current_and_del",
            bindKey: { win: "Alt-Enter", mac: "Alt-Enter" },
            exec: function (editor) {
                console.log("run_current_and_del");
                commandActions.current.run_current_and_del(editor);
            },
        });
        commands.addCommand({
            name: "run_cell",
            bindKey: { win: "Ctrl-Enter", mac: "Cmd-Enter" },
            exec: function (editor) {
                console.log("run_cell");
                commandActions.current.run_cell(editor);
            },
        });
        commands.addCommand({
            name: "MyIntdent",
            bindKey: { win: "Ctrl-]", mac: "Cmd-]" },
            exec: function (editor) {
                console.log("MyIntdent");
                editor.blockIndent();
            },
            multiSelectAction: "forEach",
            scrollIntoView: "selectionPart",
        });
        commands.addCommand({
            name: "MyOutdent",
            bindKey: { win: "Ctrl-[", mac: "Cmd-[" },
            exec: function (editor) {
                console.log("MyOutdent");
                editor.blockOutdent();
            },
            multiSelectAction: "forEach",
            scrollIntoView: "selectionPart",
        });
        return () => {
            for (const name of ["save", "ctrl-c", "ctrl-d", "run_current", "run_current_and_del", "run_cell", "MyIntdent", "MyOutdent"]) {
                commands.removeCommand(name);
            }
        };
    }, [editorInstance, commandActions]);

}
