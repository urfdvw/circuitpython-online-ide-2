// React
import { useState, useContext, useEffect, useRef } from "react";
// context
import AppContext from "../AppContext";
// constants
import * as constants from "../constants";
// ---- Display ----
// MUI
import { Box, Button, IconButton, Typography, Tooltip } from "@mui/material";
import { grey } from "@mui/material/colors";
import { ArrowDropDown, ArrowDropUp } from "@mui/icons-material";

const DARK_GREY = grey[300];
// for scroll to the button
import ScrollableFeed from "react-scrollable-feed"; // https://stackoverflow.com/a/52673227/7037749
// ACE
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-python";
import "ace-builds/src-noconflict/theme-tomorrow";
import "ace-builds/src-min-noconflict/ext-searchbox";
// ---- util ----
// download log
import { downloadAsFile } from "../utilComponents/react-local-file-system";
// textProcessor
import { textProcessor } from "../hooks/useSerial";
const { matchesInBetween, removeInBetween } = textProcessor;
// teb template
import TabTemplate from "../utilComponents/TabTemplate";
import MenuBar from "../utilComponents/MenuBar";
//
import { selectTabById } from "../layout/layoutUtils";
// Xterm
import XtermConsole from "./XtermConsole";

import SiblingWithBottomRightTab from "../utilComponents/SiblingWithBottomRightTab"

const RawSerialRead = () => {
    const { appConfig, serialOutput } = useContext(AppContext);
    const config = appConfig.config;
    let read_text = removeInBetween(serialOutput, constants.TITLE_START, constants.TITLE_END);

    // temp fix of the ANSI parsing
    // TODO: https://github.com/urfdvw/circuitpython-online-ide-2/issues/45
    read_text = read_text.split("\x1B[2K\x1B[0G").join("\n");

    if (config.serial_console.hide_cv) {
        read_text = removeInBetween(read_text, constants.CV_JSON_START, constants.CV_JSON_END);
    }
    // keep 1k lines to save GPU
    read_text = read_text.split("\n").slice(-1000).join("\n");
    return <pre style={{ whiteSpace: "pre-wrap", fontSize: config.serial_console.font + "pt" }}>{read_text}</pre>;
};

const RawSerialWrite = ({
    text,
    setText,
    codeHistIndex,
    setCodeHistIndex,
    consoleSendCommand,
    sendCtrlC,
    sendCtrlD,
    codeHistory,
}) => {
    const { appConfig } = useContext(AppContext);
    const config = appConfig.config;
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
    const {
        fullSerialHistory,
        serialOutput,
        clearSerialOutput,
        serialReady,
        connectToSerialPort,
        sendCtrlC,
        sendCtrlD,
        sendCode,
        codeHistory,
        configTabSelection,
        helpTabSelection,
        flexModel,
        appConfig,
    } = useContext(AppContext);
    const [serialTitle, setSerialTitle] = useState("");
    const [text, setText] = useState("");
    const [codeHistIndex, setCodeHistIndex] = useState(-1);
    const [modeHint, setModeHint] = useState(false);

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

    const menuStructure = [
        {
            text: "Ctrl-C",
            handler: sendCtrlC,
            tooltip: "Send Ctrl-C to the microcontroller",
        },
        {
            text: "Ctrl-D",
            handler: sendCtrlD,
            tooltip: "Send Ctrl-D to the microcontroller",
        },
        {
            label: "≡",
            options: [
                {
                    text: "Connect to Serial Port",
                    handler: connectToSerialPort,
                },
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
                {
                    text: "Settings",
                    handler: () => {
                        console.log("Editor -> Settings");
                        selectTabById(flexModel, "settings_tab");
                        configTabSelection.setTabName("serial_console");
                    },
                },
                {
                    text: "Help",
                    handler: () => {
                        console.log("Editor -> Help");
                        selectTabById(flexModel, "help_tab");
                        helpTabSelection.setTabName("serial_console");
                    },
                },
            ],
        },
    ];

    const send_mode =
        appConfig.config.serial_console.send_mode === "text"
            ? "Text mode: newline not allowed"
            : appConfig.config.serial_console.enter_to_send
                ? "Code mode: Enter to send, Shift-Enter for newline"
                : "Code mode: Shift-Enter to send, Enter for newline";

    const sendTooltip = text.split("\n").length > 1 ? "Send as code snippet" : "Send";

    const sendMenuStructure = [
        {
            label: "Mode",
            options: [
                {
                    text: "code mode: better for python RELP",
                    handler: () => {
                        appConfig.setConfigField("serial_console", "send_mode", "code");
                    },
                },
                {
                    text: "text mode: better for input() interactions",
                    handler: () => {
                        appConfig.setConfigField("serial_console", "send_mode", "text");
                        setText((prevText) => prevText.split("\n").join(" ")); // remove newlines
                    },
                },
            ],
        },
        appConfig.config.serial_console.send_mode === "code"
            ? {
                label: "Shortcuts",
                options: [
                    {
                        text: "Enter to send, Shift-Enter for newline",
                        handler: () => {
                            appConfig.setConfigField("serial_console", "enter_to_send", true);
                        },
                    },
                    {
                        text: "Shift-Enter to send, Enter for newline",
                        handler: () => {
                            appConfig.setConfigField("serial_console", "enter_to_send", false);
                        },
                    },
                ],
            }
            : null,
    ].filter((item) => item !== null);

    return serialReady ? (
        <TabTemplate title={serialReady ? serialTitle : "Not Connected"} menuStructure={menuStructure}>
            {appConfig.config.serial_console.use_xterm ? (
                <XtermConsole />
            ) : (
                <Box sx={{ display: "flex", flexDirection: "column", height: "100%", overflowX: "hidden" }}>
                    <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto" }}>
                        {/* Ensures B is scrollable if content overflows */}
                        <ScrollableFeed
                            sx={{
                                flexShrink: 0,
                                display: "flex",
                            }}
                        >
                            <RawSerialRead />
                        </ScrollableFeed>
                    </Box>
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            borderTop: "2px solid rgb(239,239,239)",
                        }}
                    >
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "left",
                                flex: 1,
                            }}
                        >
                            <RawSerialWrite
                                text={text}
                                setText={setText}
                                consoleSendCommand={consoleSendCommand}
                                codeHistIndex={codeHistIndex}
                                setCodeHistIndex={setCodeHistIndex}
                                sendCtrlC={sendCtrlC}
                                sendCtrlD={sendCtrlD}
                                codeHistory={codeHistory}
                            />
                        </Box>
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "end",
                                justifyContent: "right",
                            }}
                        >
                            <Tooltip title={sendTooltip} placement="top">
                                <Button onClick={consoleSendCommand}>Send</Button>
                            </Tooltip>
                            <Tooltip title={"change send mode"} placement="top">
                                <IconButton>
                                    {modeHint ? (
                                        <ArrowDropDown
                                            onClick={() => {
                                                setModeHint(false);
                                            }}
                                        />
                                    ) : (
                                        <ArrowDropUp
                                            onClick={() => {
                                                setModeHint(true);
                                            }}
                                        />
                                    )}
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Box>
                    {modeHint && (
                        <SiblingWithBottomRightTab label="py" tooltip="Open Code Snippet Area" onClick={() => { console.log('hey there') }}>
                            <Box
                                sx={{
                                    flexGrow: 0,
                                    display: "flex",
                                    flexDirection: "row",
                                    width: "100%",
                                    borderTop: `1px solid ${DARK_GREY}`,
                                    margin: "0px",
                                    padding: "0px",
                                }}
                            >
                                <Box sx={{ flexGrow: 1, overflowX: "auto", alignContent: "center" }}>
                                    <Typography sx={{ paddingLeft: "5px" }}>{send_mode}</Typography>
                                </Box>
                                <Box sx={{ flexGrow: 0 }}>
                                    <MenuBar menuStructure={sendMenuStructure} />
                                </Box>
                            </Box>
                        </SiblingWithBottomRightTab>
                    )}
                </Box>
            )}
        </TabTemplate>
    ) : (
        <Button onClick={connectToSerialPort}>Connect to Serial Port</Button>
    );
};

export default RawConsole;
