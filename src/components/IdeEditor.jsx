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
// register snippet modules for the modes above, else ext-language_tools
// tries to fetch them from the server (404 -> console SyntaxError noise)
import "ace-builds/src-noconflict/snippets/python";
import "ace-builds/src-noconflict/snippets/json";
import "ace-builds/src-noconflict/snippets/markdown";
import "ace-builds/src-noconflict/snippets/text";
// Layout
import PopUp from "../utilComponents/PopUp";
import { selectTabById } from "../layout/layoutUtils";
// file utils
import { getFileText, writeFileText, isEntryHealthy } from "../utilComponents/react-local-file-system";
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
// syntax checking
import useSyntaxCheck from "../hooks/useSyntaxCheck";
import useEditorCommands from "../hooks/useEditorCommands";
// side effect only: points ACE at its bundled JSON worker (json syntax annotations)
import "../utilFunctions/aceJsonWorker";

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

function hasBreakpointComment(lineText) {
    return /#\s*●/.test(lineText);
}

export default function IdeEditor({ node }) {
    const {
        appConfig,
        fileLookUp,
        helpTabSelection,
        configTabSelection,
        flexModel,
        sendCtrlC,
        sendCtrlD,
        sendCode,
        setInstrumentationOutdated,
        setFileDirty,
        clearFileDirty,
        autoWatchFiles,
    } = useContext(AppContext);
    const config = appConfig.config;
    const fileKey = node.getConfig().fileKey;
    const fileHandle = fileLookUp[fileKey];
    const aceEditorRef = useRef(null);
    const [editorInstance, setEditorInstance] = useState(null);
    const [text, setText] = useState("");
    const [loadedFile, setLoadedFile] = useState(null);
    const [loadError, setLoadError] = useState(null);
    const [loadAttempt, setLoadAttempt] = useState(0);
    const saving = useRef(false);
    // last loaded-or-saved content; the editor is "dirty" iff text differs from this baseline
    const [savedText, setSavedText] = useState("");
    const [popped, setPopped] = useState(false);
    const [fileExists, setFileExists] = useState(true);
    // true when the file changed on disk while we hold unsaved local edits
    const [conflict, setConflict] = useState(false);
    const [breakpoints, setBreakpoints] = useState(new Set());
    // instant, event-driven dirtiness: no disk read needed
    const fileEdited = text !== savedText;

    // Poll only drive-backed files; serial reads interrupt the board's program.
    useEffect(() => {
        if (!autoWatchFiles || loadedFile !== fileHandle) return;
        let cancelled = false;
        let timer;
        const check = async () => {
            try {
                if (saving.current) return;
                const healthy = await isEntryHealthy(fileHandle);
                if (cancelled) return;
                setFileExists(healthy);
                if (!healthy) return;
                const diskText = await getFileText(fileHandle);
                const editor = aceEditorRef.current?.editor;
                // Edits, saves, and unmounts invalidate an in-flight disk read.
                if (cancelled || saving.current || !editor || editor.getValue() !== text) return;
                if (diskText === savedText) {
                    setConflict(false);
                } else if (text === savedText) {
                    editor.session.setValue(diskText);
                    setSavedText(diskText);
                    setConflict(false);
                } else {
                    setConflict(true);
                }
            } catch (error) {
                if (!cancelled) console.warn("Could not check file for changes:", error);
            } finally {
                if (!cancelled) timer = setTimeout(check, 2000);
            }
        };
        timer = setTimeout(check, 2000);
        return () => { cancelled = true; clearTimeout(timer); };
    }, [fileHandle, loadedFile, text, savedText, autoWatchFiles]);

    useEffect(() => {
        const name = (fileEdited ? FILE_EDITED : "") + fileHandle.name;
        node.getModel().doAction(FlexLayout.Actions.renameTab(node.getId(), name));
    }, [fileEdited, fileHandle.name, node]);

    // report dirty status to the shared registry used by the tab-close / page-close guards
    useEffect(() => {
        setFileDirty(fileKey, fileEdited);
    }, [fileEdited, fileKey, setFileDirty]);
    useEffect(() => {
        return () => clearFileDirty(fileKey);
    }, [clearFileDirty, fileKey]);

    useEffect(() => {
        if (!editorInstance || loadedFile === fileHandle) return;
        let cancelled = false;
        setLoadError(null);
        async function loadText() {
            try {
                const fileText = await getFileText(fileHandle);
                if (cancelled) return;
                editorInstance.session.setValue(fileText);
                setSavedText(fileText);
                setConflict(false);
                setFileExists(true);
                setLoadedFile(fileHandle);
            } catch (error) {
                if (!cancelled) setLoadError({ file: fileHandle, message: error.message || String(error) });
            }
        }
        loadText();
        return () => { cancelled = true; };
    }, [fileHandle, editorInstance, loadedFile, loadAttempt]);

    useEffect(() => {
        editorInstance?.session.setNewLineMode(config.editor.newline_mode);
    }, [config.editor.newline_mode, editorInstance]);

    useEffect(() => {
        setBreakpoints(new Set(text.split("\n").flatMap((line, index) => hasBreakpointComment(line) ? [index] : [])));
    }, [text]);

    // Update gutter decorations whenever breakpoints change
    useEffect(() => {
        if (editorInstance) {
            const editor = editorInstance;
            const document = editor.container.ownerDocument;
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
    }, [breakpoints, editorInstance]);

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

    // live syntax-error annotations: python via tree-sitter, json via ACE's own worker
    // (registered by the aceJsonWorker import above)
    useSyntaxCheck(editorInstance, text, mode);

    async function saveFile(contents) {
        if (loadedFile !== fileHandle || saving.current) return;
        saving.current = true;
        try {
            if (!(await writeFileText(fileHandle, contents))) return;
            setSavedText(contents);
            setConflict(false);
            setInstrumentationOutdated(true);
        } finally {
            saving.current = false;
        }
    }

    // conflict resolution: keep the editor's version and overwrite disk
    function resolveKeepMine() {
        saveFile(text);
    }

    // conflict resolution: discard local edits and reload the on-disk version
    async function resolveUseDisk() {
        const diskText = await getFileText(fileHandle);
        aceEditorRef.current.editor.session.setValue(diskText);
        setSavedText(diskText);
        setConflict(false);
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
            // Send the selected code.
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
                        true,
                    );
                    aceEditorRef.current.editor.insert("\n");
                } else {
                    aceEditorRef.current.editor.gotoLine(
                        currline + 2,
                        aceEditorRef.current.editor.session.getLine(currline + 1).length,
                        true,
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

    const commandActions = useRef(null);
    commandActions.current = { text, saveFile, sendCtrlC, sendCtrlD, run_current, run_current_and_del, run_cell };

    useEditorCommands(editorInstance, commandActions);

    // Bind to the actual editor, which changes when popping out or docking.
    useEffect(() => {
        if (!editorInstance) return;
        let cancelled = false;
        const gutter = editorInstance.renderer.$gutterLayer;
        if (!gutter) return;
        const gutterElement = gutter.element;

        async function handleGutterClick(event) {
            const cell = event.target.closest && event.target.closest(".ace_gutter-cell");
            if (!cell) return;
            if (event.target.classList.contains("ace_fold-widget")) return;
            const rect = cell.getBoundingClientRect();
            if (event.clientX - rect.left > rect.width - 20) return;

            let lineNum = NaN;
            const rowAttr =
                cell.getAttribute("data-row") ||
                cell.getAttribute("data-gutter-row") ||
                cell.getAttribute("data-ace-row");
            if (rowAttr !== null) {
                lineNum = parseInt(rowAttr, 10);
            } else {
                const displayed = parseInt(cell.textContent, 10);
                if (!isNaN(displayed)) lineNum = displayed - 1;
            }

            if (!isNaN(lineNum) && lineNum >= 0) {
                const session = editorInstance.session;
                const line = session.getLine(lineNum);
                if (hasBreakpointComment(line)) {
                    const newLine = line.replace(/#\s*●/, "").trimEnd();
                    session.replace(new Range(lineNum, 0, lineNum, line.length), newLine);
                    setText(session.getValue());
                } else {
                    const snapshot = session.getValue();
                    const codeRows = await identifyCodeRows(snapshot);
                    if (cancelled || session.getValue() !== snapshot) return;
                    if (codeRows.has(lineNum)) {
                        console.log("Can set breakpoint on a code row.");
                        const newLine = line + (line.trim() ? " " : "") + "# ●";
                        session.replace(new Range(lineNum, 0, lineNum, line.length), newLine);
                        setText(session.getValue());
                    }
                }
            }
        }

        gutterElement.addEventListener("click", handleGutterClick);
        return () => {
            cancelled = true;
            gutterElement.removeEventListener("click", handleGutterClick);
        };
    }, [editorInstance]);

    const title =
        "Editor: " +
        fileHandle.fullPath +
        (fileExists ? "" : " (deleted)") +
        (conflict ? " (changed on disk)" : fileEdited ? " (unsaved changes)" : "");

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
                {loadedFile !== fileHandle && (
                    <div role={loadError?.file === fileHandle ? "alert" : "status"}
                        style={{ padding: "6px 10px", background: "#fff4e5", color: "#222", fontSize: "13px" }}>
                        {loadError?.file === fileHandle ? <>
                            Could not load file: {loadError.message}{" "}
                            <button onClick={() => {
                                setLoadError(null);
                                setLoadAttempt((attempt) => attempt + 1);
                            }}>Retry</button>
                        </> : "Loading file…"}
                    </div>
                )}
                {conflict && (
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "6px 10px",
                            background: "#fff4e5",
                            borderBottom: "1px solid #f0c36d",
                            fontSize: "13px",
                        }}
                    >
                        <span style={{ flex: 1 }}>
                            This file changed on disk while you have unsaved edits.
                        </span>
                        <button onClick={resolveKeepMine}>Keep mine</button>
                        <button onClick={resolveUseDisk}>Use disk</button>
                    </div>
                )}
                <AceEditor
                    ref={aceEditorRef}
                    onLoad={setEditorInstance}
                    mode={mode}
                    useSoftTabs={true}
                    wrapEnabled={true}
                    tabSize={4}
                    theme="tomorrow"
                    value={text}
                    readOnly={loadedFile !== fileHandle}
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
                        useWorker: true,
                    }}
                />
            </TabTemplate>
        </PopUp>
    );
}
