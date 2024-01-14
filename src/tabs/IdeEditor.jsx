/* eslint-disable react/prop-types */
// react
import { useEffect, useState, useRef, useContext } from "react";
// ace
import AceEditor from "react-ace";
import { Ace } from "ace-builds";
import "ace-builds/src-min-noconflict/ext-searchbox";
import "ace-builds/src-min-noconflict/ext-language_tools";
import "ace-builds/src-noconflict/mode-python";
import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/mode-markdown";
import "ace-builds/src-noconflict/theme-tomorrow";
// MUI
import SaveIcon from "@mui/icons-material/Save";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
// Layout
import PopUp from "../layout/PopUp";
// file utils
import { getFileText, writeFileText } from "../react-local-file-system";
// context
import ideContext from "../ideContext";
// commands
import useSerialCommands from "../serial/useSerialCommands";

export default function IdeEditor({ fileHandle, node }) {
    const { sendCtrlC, sendCtrlD, sendCode } = useSerialCommands();
    const { config } = useContext(ideContext);
    const aceEditorRef = useRef(null);
    const [text, setText] = useState("");
    useEffect(() => {
        async function loadText() {
            const fileText = (await getFileText(fileHandle)).split("\r").join(""); // circuitPython turned to used \r but not very easy to handle
            setText(fileText);
        }
        loadText();
    }, [fileHandle]);
    const parentHeight = node.getParent()._rect.height - node.getParent()._tabHeaderRect.height;
    var mode = "text";
    if (fileHandle.name.toLowerCase().endsWith(".py")) {
        mode = "python";
    }
    if (fileHandle.name.toLowerCase().endsWith(".md")) {
        mode = "markdown";
    }
    if (fileHandle.name.toLowerCase().endsWith(".json")) {
        mode = "json";
    }
    function saveFile(text) {
        writeFileText(fileHandle, text);
    }

    // send code from editor

    function run_current_and_del() {
        run_current_raw(true);
    }

    function run_current() {
        run_current_raw(false);
    }

    function run_current_raw(del) {
        var currline = aceEditorRef.current.editor.getCursorPosition().row;
        var selected = aceEditorRef.current.editor.getSelectedText();
        if (selected) {
            // if any sellection
            sendCode(selected);
            if (del) {
                aceEditorRef.current.editor.insert("");
            }
        } else {
            var line_text = aceEditorRef.current.editor.session.getLine(currline);
            sendCode(line_text);
            if (del) {
                aceEditorRef.current.editor.session.removeFullLines(currline, currline);
                aceEditorRef.current.editor.gotoLine(
                    currline,
                    aceEditorRef.current.editor.session.getLine(currline).length,
                    true
                );
                aceEditorRef.current.editor.insert("\n");
            } else {
                if (currline == aceEditorRef.current.editor.session.getLength() - 1) {
                    aceEditorRef.current.editor.gotoLine(
                        currline + 1,
                        aceEditorRef.current.editor.session.getLine(currline).length,
                        true
                    );
                    aceEditorRef.current.editor.insert("\n");
                } else {
                    aceEditorRef.current.editor.gotoLine(
                        currline + 2,
                        aceEditorRef.current.editor.session.getLine(currline + 1).length,
                        true
                    );
                }
            }
        }
    }

    function run_cell() {
        var current_line = editor.getSelectionRange().start.row;
        var topline = current_line; // included
        while (true) {
            if (topline == 0) {
                break;
            }
            if (editor.session.getLine(topline).startsWith("#%%")) {
                break;
            }
            topline -= 1;
        }
        var bottonline = current_line; // not included
        while (true) {
            bottonline += 1;
            if (bottonline == editor.session.getLength()) {
                editor.gotoLine(editor.session.getLength(), 0, true);
                break;
            }
            if (editor.session.getLine(bottonline).startsWith("#%%")) {
                editor.gotoLine(bottonline + 1, 0, true);
                break;
            }
        }
        var cell = editor.getValue().split("\n").slice(topline, bottonline).join("\n");

        console.log("DEBUG", "cell detected", cell);

        send_multiple_lines(cell);
    }

    if (aceEditorRef.current !== null) {
        // add key bindings
        aceEditorRef.current.editor.commands.addCommand({
            name: "save",
            bindKey: { win: "Ctrl-S", mac: "Command-S" },
            exec: () => {
                saveFile(text);
            },
        });
        aceEditorRef.current.editor.commands.addCommand({
            name: "ctrl-c",
            bindKey: { win: "Ctrl-Shift-C", mac: "Ctrl-C" },
            exec: sendCtrlC,
        });
        aceEditorRef.current.editor.commands.addCommand({
            name: "ctrl-d",
            bindKey: { win: "Ctrl-Shift-D", mac: "Ctrl-D" },
            exec: sendCtrlD,
        });
        aceEditorRef.current.editor.commands.addCommand({
            name: "run_current",
            bindKey: { win: "Shift-Enter", mac: "Shift-Enter" },
            exec: function (editor) {
                console.log("run_current");
                run_current(editor);
            },
        });
        aceEditorRef.current.editor.commands.addCommand({
            name: "run_current_and_del",
            bindKey: { win: "Alt-Enter", mac: "Alt-Enter" },
            exec: function (editor) {
                console.log("run_current_and_del");
                run_current_and_del(editor);
            },
        });
    }

    return (
        <PopUp title={fileHandle.name} parentStyle={{ height: parentHeight + "px" }}>
            <AceEditor
                ref={aceEditorRef}
                mode={mode}
                useSoftTabs={true}
                wrapEnabled={true}
                tabSize={4}
                theme="tomorrow"
                value={text}
                height="100%"
                width="100%"
                onChange={(newValue) => {
                    setText(newValue);
                }}
                fontSize={config.editor.font + "pt"}
                setOptions={{
                    enableBasicAutocompletion: true,
                    enableLiveAutocompletion: config.editor.live_autocompletion,
                    enableSnippets: true,
                    showLineNumbers: true,
                    tabSize: 4,
                }}
            />
            <Tooltip
                title="Save and Run"
                sx={{ position: "absolute", bottom: 16, right: 16, zIndex: 1 }}
                followCursor={true}
            >
                <IconButton
                    onClick={() => {
                        saveFile(text);
                    }}
                >
                    <SaveIcon />
                </IconButton>
            </Tooltip>
        </PopUp>
    );
}
