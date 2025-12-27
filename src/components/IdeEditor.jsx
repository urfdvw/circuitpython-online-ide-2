/* eslint-disable react/prop-types */
// react
import { useEffect, useState, useRef, useContext } from "react";
// ace
import AceEditor from "react-ace";
import { Range } from "ace-builds/src-noconflict/ace";
import "ace-builds/src-min-noconflict/ext-searchbox";
import "ace-builds/src-min-noconflict/ext-language_tools";
import "ace-builds/src-noconflict/mode-python";
import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/mode-markdown";
import "ace-builds/src-noconflict/theme-tomorrow";
// Layout
import PopUp from "../utilComponents/PopUp";
import { selectTabById } from "../layout/layoutUtils";
// file utils
import { getFileText, writeFileText, isEntryHealthy, isfileSame } from "../utilComponents/react-local-file-system";
// context
import AppContext from "../AppContext";
// constant
import { FILE_EDITED } from "../constants";
// Flex layout
import * as FlexLayout from "flexlayout-react";
// tab
import TabTemplate from "../utilComponents/TabTemplate";
// breakpoints
import { identifyCodeRows } from "../utilFunctions/debuggerUtils";

// CSS for breakpoint styling
const breakpointStyles = `
    .ace_gutter-cell.ace_breakpoint::before {
        content: "●";
        color: #ff0000;
        font-size: 18px;
        font-weight: bold;
          position: absolute;
          left: 2px; 
          top: 9px;
          transform: translateY(-50%);
          z-index: 10;
    }
    .ace_gutter-cell.ace_breakpoint {
        cursor: pointer;
    }
`;

function generateRandomNumber(a) {
    // Calculate the range between a and a/4
    const min = a;
    const max = a / 4;
    // Generate a random number within the range
    // Using Math.floor() for an integer result
    const randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;
    return randomNumber;
}

export default function IdeEditor({ node }) {
    const { appConfig, fileLookUp, helpTabSelection, configTabSelection, flexModel, sendCtrlC, sendCtrlD, sendCode } =
        useContext(AppContext);
    const config = appConfig.config;
    const fileHandle = fileLookUp[node.getConfig().fileKey];
    const aceEditorRef = useRef(null);
    const [text, setText] = useState("");
    const [fileEdited, setFileEdited] = useState(false);
    const [popped, setPopped] = useState(false);
    const [fileExists, setFileExists] = useState(true);
    const [breakpoints, setBreakpoints] = useState(new Set());
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

    // Function to check if a line has a breakpoint comment
    function hasBreakpointComment(lineText) {
        const breakpointRegex = /#\s*●/;
        return breakpointRegex.test(lineText);
    }

    // Function to update breakpoints based on text content
    function updateBreakpointsFromText() {
        const lines = text.split("\n");
        const newBreakpoints = new Set();
        lines.forEach((line, index) => {
            if (hasBreakpointComment(line)) {
                newBreakpoints.add(index);
            }
        });
        setBreakpoints(newBreakpoints);
    }

    // Update breakpoints when text changes
    useEffect(() => {
        updateBreakpointsFromText();
    }, [text]);

    // Update gutter decorations whenever breakpoints change
    useEffect(() => {
        if (aceEditorRef.current) {
            const editor = aceEditorRef.current.editor;
            const session = editor.session;

            // Add stylesheet for breakpoint styling if not already added
            if (!document.getElementById("breakpoint-styles")) {
                const styleEl = document.createElement("style");
                styleEl.id = "breakpoint-styles";
                styleEl.textContent = breakpointStyles;
                document.head.appendChild(styleEl);
            }

            // Clear existing gutter decorations
            session.clearBreakpoints();

            // Add breakpoint markers to the gutter
            breakpoints.forEach((lineNum) => {
                session.setBreakpoint(lineNum, "ace_breakpoint");
            });
        }
    }, [breakpoints]);

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
                var session = aceEditorRef.current.editor.session;
                var currentRow = aceEditorRef.current.editor.getCursorPosition().row;
                var lineLength = session.getLine(currentRow).length;
                // Define the range of the text to remove (excluding the line ending)
                var range = new Range(currentRow, 0, currentRow, lineLength);
                // Remove the text
                session.remove(range);
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
        aceEditorRef.current.editor.commands.addCommand({
            name: "MyIntdent",
            bindKey: { win: "Ctrl-]", mac: "Cmd-]" },
            exec: function (editor) {
                console.log("MyIntdent");
                editor.blockIndent();
            },
            multiSelectAction: "forEach",
            scrollIntoView: "selectionPart",
        });
        aceEditorRef.current.editor.commands.addCommand({
            name: "MyOutdent",
            bindKey: { win: "Ctrl-[", mac: "Cmd-[" },
            exec: function (editor) {
                console.log("MyOutdent");
                editor.blockOutdent();
            },
            multiSelectAction: "forEach",
            scrollIntoView: "selectionPart",
        });

        // Add gutter click handler for breakpoints
        const gutter = aceEditorRef.current.editor.renderer.$gutterLayer;
        if (gutter && !gutter.breakpointHandlerAttached) {
            const gutterElement = gutter.element;
            gutterElement.addEventListener("click", (event) => {
                // Prefer getting the row directly from the clicked gutter cell DOM element
                const cell = event.target.closest && event.target.closest(".ace_gutter-cell");
                if (!cell) return;

                // --- Restricted Logic Change ---
                // Ignore if the click target is the fold widget (the collapse arrow)
                if (event.target.classList.contains("ace_fold-widget")) return;

                // Restrict click to the left side of the gutter cell (to avoid triggering fold logic)
                const rect = cell.getBoundingClientRect();
                const relativeX = event.clientX - rect.left;
                if (relativeX > rect.width - 20) return;
                // --- End Logic Change ---

                let lineNum = NaN;
                const rowAttr =
                    cell.getAttribute("data-row") ||
                    cell.getAttribute("data-gutter-row") ||
                    cell.getAttribute("data-ace-row");
                if (rowAttr !== null) {
                    lineNum = parseInt(rowAttr, 10);
                } else {
                    // Fallback: parse displayed line number and convert to zero-based index
                    const displayed = parseInt(cell.textContent, 10);
                    if (!isNaN(displayed)) {
                        lineNum = displayed - 1;
                    }
                }

                if (!isNaN(lineNum) && lineNum >= 0) {
                    const session = aceEditorRef.current.editor.session;
                    const line = session.getLine(lineNum);

                    // Check if line already has breakpoint comment
                    if (hasBreakpointComment(line)) {
                        // Remove breakpoint comment
                        const newLine = line.replace(/#\s*●/, "").trimEnd();
                        const range = new Range(lineNum, 0, lineNum, line.length);
                        session.replace(range, newLine);
                        setText(session.getValue());
                    } else {
                        // Add breakpoint comment
                        const codeRows = identifyCodeRows(session.getValue());
                        if (codeRows.has(lineNum)) {
                            console.log("Can set breakpoint on a code row.");
                            const newLine = line + (line.trim() ? " " : "") + "# ●";
                            const range = new Range(lineNum, 0, lineNum, line.length);
                            session.replace(range, newLine);
                            setText(session.getValue());
                        }
                    }
                }
            });
            gutter.breakpointHandlerAttached = true;
        }
    }

    const title =
        "Editor: " + fileHandle.fullPath + (fileExists ? "" : " (deleted)") + (fileEdited ? " (unsaved changes)" : "");

    const menuStructure = [
        {
            text: "Save",
            handler: () => {
                saveFile(text);
            },
            tooltip: "Save and Run",
        },
        {
            label: "≡",
            options: [
                {
                    text: popped ? "Dock" : "Pop Up",
                    handler: () => {
                        setPopped((prev) => !prev);
                    },
                },
                {
                    text: "Help",
                    handler: () => {
                        console.log("Editor -> Help");
                        selectTabById(flexModel, "help_tab");
                        helpTabSelection.setTabName("editor");
                    },
                },
                {
                    text: "Settings",
                    handler: () => {
                        console.log("Editor -> Settings");
                        selectTabById(flexModel, "settings_tab");
                        configTabSelection.setTabName("editor");
                    },
                },
            ],
        },
    ];

    return (
        <PopUp popped={popped} setPopped={setPopped} title={fileHandle.name} parentStyle={{ height: height + "px" }}>
            <TabTemplate title={title} menuStructure={menuStructure}>
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
            </TabTemplate>
        </PopUp>
    );
}
