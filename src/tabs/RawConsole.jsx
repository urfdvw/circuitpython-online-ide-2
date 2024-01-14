import { useContext, useRef } from "react";
// MUI
import Box from "@mui/material/Box";
// Other packages
import ScrollableFeed from "react-scrollable-feed"; // https://stackoverflow.com/a/52673227/7037749
// Mine
import { removeInBetween } from "../serial/textProcessor";
import * as constants from "../serial/constants";
// command
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-python";
import "ace-builds/src-noconflict/theme-tomorrow";
import { useState } from "react";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import SendIcon from "@mui/icons-material/Send";
// default
import Button from "@mui/material/Button";
//context
import ideContext from "../ideContext";
// commands
import useSerialCommands from "../serial/useSerialCommands";

const RawSerialIn = () => {
    // "in" to computer, "out" from microcontroller
    const { config, serialOutput } = useContext(ideContext);
    let output = removeInBetween(serialOutput, constants.TITLE_START, constants.TITLE_END);

    if (config.raw_console.hide_cv) {
        output = removeInBetween(output, constants.CV_JSON_START, constants.CV_JSON_END);
    }

    return <pre style={{ whiteSpace: "pre-wrap", fontSize: config.raw_console.font + "pt" }}>{output}</pre>;
};

const RawSerialOut = () => {
    const { config } = useContext(ideContext);
    const aceEditorRef = useRef(null);
    const [text, setText] = useState("");
    const [isHovered, toggleHover] = useState(false);
    const { sendCtrlC, sendCtrlD, sendCode, codeHistory } = useSerialCommands();
    const [tempCode, setTempCode] = useState("");
    const [codeHistIndex, setCodeHistIndex] = useState(-1);

    function consoleSendCommand() {
        if (text.trim().length === 0) {
            return;
        }
        sendCode(text);
        setCodeHistIndex(-1);
        setText("");
    }

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
                command.getCursorPosition().column,
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
            exec: sendCtrlC,
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
        if (config.raw_console.send_mode === "code") {
            aceEditorRef.current.editor.commands.addCommand({
                name: "send",
                bindKey: config.raw_console.enter_to_send ? "Enter" : "Shift-Enter",
                exec: consoleSendCommand,
            });
            aceEditorRef.current.editor.commands.addCommand({
                name: "newline",
                bindKey: config.raw_console.enter_to_send ? "Shift-Enter" : "Enter",
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
                mode={config.raw_console.send_mode === "code" ? "python" : "text"}
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
                fontSize={config.raw_console.font + "pt"}
            />
            <div
                onMouseEnter={() => {
                    toggleHover(true);
                }}
                onMouseLeave={() => {
                    toggleHover(false);
                }}
            >
                <Tooltip
                    title="Send text to microcontroller"
                    sx={{ position: "absolute", bottom: 16, right: 16, zIndex: 1 }}
                    followCursor={true}
                >
                    <IconButton onClick={consoleSendCommand}>
                        <SendIcon />
                    </IconButton>
                </Tooltip>
                <Tooltip
                    title="Send Ctrl-C to microcontroller"
                    sx={{ position: "absolute", bottom: 46, right: 16, zIndex: 1 }}
                    followCursor={true}
                >
                    <IconButton onClick={sendCtrlC}>
                        <span style={{ visibility: isHovered ? "visible" : "hidden" }}>Ⓒ</span>
                    </IconButton>
                </Tooltip>
                <Tooltip
                    title="Send Ctrl-D to microcontroller"
                    sx={{ position: "absolute", bottom: 76, right: 16, zIndex: 1 }}
                    followCursor={true}
                >
                    <IconButton onClick={sendCtrlD}>
                        <span style={{ visibility: isHovered ? "visible" : "hidden" }}>Ⓓ</span>
                    </IconButton>
                </Tooltip>
            </div>
        </>
    );
};

const RawConsole = () => {
    const { serialReady: ready, connectToSerialPort: connect } = useContext(ideContext);
    return ready ? (
        <Box sx={{ height: "100%" }}>
            <ScrollableFeed>
                <RawSerialIn />
                <RawSerialOut />
            </ScrollableFeed>
        </Box>
    ) : (
        <Button onClick={connect}>Connect to Serial Port</Button>
    );
};

export default RawConsole;
