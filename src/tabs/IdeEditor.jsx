/* eslint-disable react/prop-types */
// react
import { useEffect, useState, useRef, useContext } from "react";
// ace
import AceEditor from "react-ace";
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
import Typography from "@mui/material/Typography";
// Layout
import PopUp from "../layout/PopUp";
// file utils
import { getFileText, writeFileText, isEntryHealthy, isfileSame } from "../react-local-file-system";
// context
import ideContext from "../ideContext";
// commands
import useSerialCommands from "../serial/useSerialCommands";
// constant
import { FILE_EDITED } from "../constants";
// Flex layout
import * as FlexLayout from "flexlayout-react";
// toolbar
import Toolbar from "@mui/material/Toolbar";
import { Menu } from "../layout/Menu";
import Button from "@mui/material/Button";

function generateRandomNumber(a) {
    // Calculate the range between a and a/4
    const min = a;
    const max = a / 4;
    // Generate a random number within the range
    // Using Math.floor() for an integer result
    const randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;
    return randomNumber;
}

export default function IdeEditor({ fileHandle, node }) {
    const { sendCtrlC, sendCtrlD, sendCode } = useSerialCommands();
    const { config } = useContext(ideContext);
    const aceEditorRef = useRef(null);
    const [text, setText] = useState("");
    const [fileEdited, setFileEdited] = useState(false);
    const [popped, setPopped] = useState(false);
    const [fileExists, setFileExists] = useState(true);
    // scheduled state checking
    useEffect(() => {
        const interval = setInterval(async () => {
            setFileExists(await isEntryHealthy(fileHandle));
            setFileEdited(!(await isfileSame(fileHandle, text)));
        }, generateRandomNumber(1000));
        return () => clearInterval(interval);
    }, [fileHandle, text]);

    useEffect(() => {
        const name = (fileEdited ? FILE_EDITED : "") + fileHandle.name;
        node.getModel().doAction(FlexLayout.Actions.renameTab(node.getId(), name));
    }, [fileEdited]);

    useEffect(() => {
        async function loadText() {
            const fileText = await getFileText(fileHandle);
            aceEditorRef.current.editor.session.setValue(fileText);
            setFileEdited(false);
        }
        loadText();
    }, [fileHandle]);

    useEffect(() => {
        aceEditorRef.current.editor.session.setNewLineMode(config.editor.newline_mode);
    }, [config.editor.newline_mode]);

    const height = node.getRect().height;
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
        setFileEdited(false);
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
        var current_line = aceEditorRef.current.editor.getCursorPosition().row;
        var topline = current_line; // included
        while (true) {
            if (topline == 0) {
                break;
            }
            if (aceEditorRef.current.editor.session.getLine(topline).startsWith("#%%")) {
                break;
            }
            topline -= 1;
        }
        var bottonline = current_line; // not included
        while (true) {
            bottonline += 1;
            if (bottonline == aceEditorRef.current.editor.session.getLength()) {
                aceEditorRef.current.editor.gotoLine(aceEditorRef.current.editor.session.getLength(), 0, true);
                break;
            }
            if (aceEditorRef.current.editor.session.getLine(bottonline).startsWith("#%%")) {
                aceEditorRef.current.editor.gotoLine(bottonline + 1, 0, true);
                break;
            }
        }
        var cell = aceEditorRef.current.editor.getValue().split("\n").slice(topline, bottonline).join("\n");

        console.log("DEBUG", "cell detected", cell);

        sendCode(cell);
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
        aceEditorRef.current.editor.commands.addCommand({
            name: "run_cell",
            bindKey: { win: "Ctrl-Enter", mac: "Cmd-Enter" },
            exec: function (editor) {
                console.log("run_cell");
                run_cell(editor);
            },
        });
    }

    const hiddenMenuLabelOptions = [
        {
            text: "Pop Up",
            handler: () => {
                console.log("Pop Up");
                setPopped(true);
            },
        },
    ];

    return (
        <PopUp popped={popped} setPopped={setPopped} title={fileHandle.name} parentStyle={{ height: height + "px" }}>
            <div style={{ display: "flex", flexDirection: "column", height: "100%", overflowX: "hidden" }}>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        borderBottom: "2px solid rgb(239,239,239)",
                        width: "100%",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "left",
                            flex: 1,
                        }}
                    >
                        <Typography component="p" sx={{ marginLeft: "10pt" }}>
                            Editor: {fileHandle.fullPath}
                            {fileExists ? "" : " (deleted)"}
                            {fileEdited ? " (unsaved changes)" : ""}
                        </Typography>
                    </div>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "left",
                        }}
                    >
                        <Toolbar variant="dense" disableGutters={true} sx={{ minHeight: "35px", maxHeight: "35px" }}>
                            <Tooltip title="Save and Run" followCursor={true}>
                                <Button
                                    onClick={() => {
                                        saveFile(text);
                                    }}
                                >
                                    Save
                                </Button>
                            </Tooltip>
                            <Menu label="⋮" options={hiddenMenuLabelOptions} />
                        </Toolbar>
                    </div>
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto" }}>
                    {/* Ensures B is scrollable if content overflows */}
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
                </div>
            </div>
        </PopUp>
    );
}
