import { useContext, useEffect, useRef } from "react";
// MUI
import Typography from "@mui/material/Typography";
// Other packages
import ScrollableFeed from "react-scrollable-feed"; // https://stackoverflow.com/a/52673227/7037749
// Mine
import { removeInBetween } from "../serial/textProcessor";
import * as constants from "../constants";
// command
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-python";
import "ace-builds/src-noconflict/theme-tomorrow";
import { useState } from "react";
import Tooltip from "@mui/material/Tooltip";
// default
import Button from "@mui/material/Button";
//context
import ideContext from "../ideContext";
// commands
import useSerialCommands from "../serial/useSerialCommands";
// toolbar
import Toolbar from "@mui/material/Toolbar";
import { Menu } from "../layout/Menu";
// download log
import { downloadAsFile } from "../react-local-file-system";
// textProcessor
import { matchesInBetween } from "../serial/textProcessor";

const RawSerialIn = () => {
    // "in" to computer, "out" from microcontroller
    const { config, serialOutput } = useContext(ideContext);
    let output = removeInBetween(serialOutput, constants.TITLE_START, constants.TITLE_END);

    // temp fix of the ANSI parsing
    // TODO: https://github.com/urfdvw/circuitpython-online-ide-2/issues/45
    output = output.split("\x1B[2K\x1B[0G").join("\n");

    if (config.serial_console.hide_cv) {
        output = removeInBetween(output, constants.CV_JSON_START, constants.CV_JSON_END);
    }
    // keep 1k lines to save GPU
    output = output.split("\n").slice(-1000).join("\n");
    return <pre style={{ whiteSpace: "pre-wrap", fontSize: config.serial_console.font + "pt" }}>{output}</pre>;
};

const RawSerialOut = ({
    text,
    setText,
    codeHistIndex,
    setCodeHistIndex,
    consoleSendCommand,
    sendCtrlC,
    sendCtrlD,
    codeHistory,
}) => {
    const { config } = useContext(ideContext);
    const aceEditorRef = useRef(null);
    const [tempCode, setTempCode] = useState("");

    // code history related
    function histUp() {
        let newCodeHistoryIndex = codeHistIndex;
        let newTempCode = tempCode;
        if (aceEditorRef.current.editor.getCursorPosition().row == 0) {
            if (codeHistIndex == -1) {
                newCodeHistoryIndex = codeHistory.length - 1;
                newTempCode = aceEditorRef.current.editor.getValue();
            } else {
                newCodeHistoryIndex = codeHistIndex - 1;
            }
            if (newCodeHistoryIndex < 0) {
                newCodeHistoryIndex = 0;
            }
            console.log(codeHistIndex, codeHistory[codeHistIndex]);
            aceEditorRef.current.editor.session.setValue(codeHistory[newCodeHistoryIndex]);
            aceEditorRef.current.editor.gotoLine(0, 0, true);
        } else {
            aceEditorRef.current.editor.gotoLine(
                aceEditorRef.current.editor.getCursorPosition().row,
                aceEditorRef.current.editor.getCursorPosition().column,
                true
            );
        }
        setCodeHistIndex(newCodeHistoryIndex);
        setTempCode(newTempCode);
    }

    function histDown() {
        let newCodeHistoryIndex = codeHistIndex;
        if (
            aceEditorRef.current.editor.getCursorPosition().row ==
            aceEditorRef.current.editor.session.getLength() - 1
        ) {
            if (codeHistIndex == -1) {
            } else if (codeHistIndex == codeHistory.length - 1) {
                aceEditorRef.current.editor.session.setValue(tempCode);
                newCodeHistoryIndex = -1;
            } else {
                newCodeHistoryIndex = codeHistIndex + 1;
                aceEditorRef.current.editor.session.setValue(codeHistory[newCodeHistoryIndex]);
            }
            aceEditorRef.current.editor.gotoLine(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, true);
        } else {
            aceEditorRef.current.editor.gotoLine(
                aceEditorRef.current.editor.getCursorPosition().row + 2,
                aceEditorRef.current.editor.getCursorPosition().column,
                true
            );
        }
        setCodeHistIndex(newCodeHistoryIndex);
    }

    function addNewline(editor) {
        editor.session.insert(editor.getCursorPosition(), "\n");
    }

    if (aceEditorRef.current !== null) {
        // add key bindings
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
            name: "histUp",
            bindKey: { win: "Up", mac: "Up" },
            exec: function (editor) {
                console.log("histUp");
                histUp(editor);
            },
        });
        aceEditorRef.current.editor.commands.addCommand({
            name: "histDown",
            bindKey: { win: "Down", mac: "Down" },
            exec: function (editor) {
                console.log("histDown");
                histDown(editor);
            },
        });
        if (config.serial_console.send_mode === "code") {
            aceEditorRef.current.editor.commands.addCommand({
                name: "send",
                bindKey: config.serial_console.enter_to_send ? "Enter" : "Shift-Enter",
                exec: consoleSendCommand,
            });
            aceEditorRef.current.editor.commands.addCommand({
                name: "newline",
                bindKey: config.serial_console.enter_to_send ? "Shift-Enter" : "Enter",
                exec: addNewline,
            });
        } else {
            aceEditorRef.current.editor.commands.addCommand({
                name: "send",
                bindKey: "Enter",
                exec: consoleSendCommand,
            });
            aceEditorRef.current.editor.commands.addCommand({
                name: "newline", // no newline allowed
                bindKey: "Shift-Enter",
                exec: consoleSendCommand,
            });
        }
    }

    return (
        <>
            <AceEditor
                ref={aceEditorRef}
                mode={config.serial_console.send_mode === "code" ? "python" : "text"}
                useSoftTabs={true}
                wrapEnabled={true}
                tabSize={4}
                theme="tomorrow"
                value={text}
                width="100%"
                maxLines={Infinity}
                onChange={(newValue) => {
                    setText(newValue);
                }}
                fontSize={config.serial_console.font + "pt"}
            />
        </>
    );
};

const RawConsole = () => {
    const { sendCtrlC, sendCtrlD, sendCode, codeHistory } = useSerialCommands();
    const { fullSerialHistory, serialOutput, clearSerialOutput, serialReady, connectToSerialPort } =
        useContext(ideContext);
    const [serialTitle, setSerialTitle] = useState("");
    const [text, setText] = useState("");
    const [codeHistIndex, setCodeHistIndex] = useState(-1);

    useEffect(() => {
        setSerialTitle(matchesInBetween(serialOutput, constants.TITLE_START, constants.TITLE_END).at(-1));
    }, [serialOutput]);

    function consoleSendCommand() {
        if (text.trim().length === 0) {
            return;
        }
        sendCode(text);
        setCodeHistIndex(-1);
        setText("");
    }
    const hiddenMenuLabelOptions = [
        {
            text: "Clear",
            handler: () => {
                console.log("Clear");
                clearSerialOutput();
            },
        },
        {
            text: "Download Log",
            handler: () => {
                console.log("Download Log");
                downloadAsFile("serial log.txt", fullSerialHistory + serialOutput);
            },
        },
    ];

    return serialReady ? (
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
                        {serialTitle}
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
                        <Tooltip title="Send Ctrl-C to the microcontroller" followCursor={true}>
                            <Button onClick={sendCtrlC}>Ctrl-C</Button>
                        </Tooltip>
                        <Tooltip title="Send Ctrl-D to the microcontroller" followCursor={true}>
                            <Button onClick={sendCtrlD}>Ctrl-D</Button>
                        </Tooltip>
                        <Menu label="⋮" options={hiddenMenuLabelOptions} />
                    </Toolbar>
                </div>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto" }}>
                {/* Ensures B is scrollable if content overflows */}
                <ScrollableFeed
                    style={{
                        flexShrink: 0,
                        display: "flex",
                    }}
                >
                    <RawSerialIn />
                </ScrollableFeed>
            </div>
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    borderTop: "2px solid rgb(239,239,239)",
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
                    <RawSerialOut
                        text={text}
                        setText={setText}
                        consoleSendCommand={consoleSendCommand}
                        codeHistIndex={codeHistIndex}
                        setCodeHistIndex={setCodeHistIndex}
                        sendCtrlC={sendCtrlC}
                        sendCtrlD={sendCtrlD}
                        codeHistory={codeHistory}
                    />
                </div>
                <div
                    style={{
                        display: "flex",
                        alignItems: "end",
                        justifyContent: "right",
                    }}
                >
                    <Button onClick={consoleSendCommand}>Send</Button>
                </div>
            </div>
        </div>
    ) : (
        <Button onClick={connectToSerialPort}>Connect to Serial Port</Button>
    );
};

export default RawConsole;
