// MUI
import Box from "@mui/material/Box";
// Other packages
import ScrollableFeed from "react-scrollable-feed"; // https://stackoverflow.com/a/52673227/7037749
// Mine
import { removeInBetween } from "../textProcessor";
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

const RawSerialIn = ({ output, config }) => {
    output = removeInBetween(output, constants.TITLE_START, constants.TITLE_END);

    if (config.raw_console.hide_cv) {
        output = removeInBetween(output, constants.CV_JSON_START, constants.CV_JSON_END);
    }

    return <pre style={{ whiteSpace: "pre-wrap", fontSize: config.raw_console.font + "pt" }}>{output}</pre>;
};

const RawSerialOut = ({ send, config }) => {
    const [mode, setMode] = useState("python");
    const [text, setText] = useState("");
    const [isHovered, toggleHover] = useState(false);

    return (
        <>
            <AceEditor
                mode={mode}
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
                    <IconButton
                        onClick={() => {
                            send(text + "\x0D");
                            setText("");
                        }}
                    >
                        <SendIcon />
                    </IconButton>
                </Tooltip>
                <Tooltip
                    title="Send Ctrl-C to microcontroller"
                    sx={{ position: "absolute", bottom: 46, right: 16, zIndex: 1 }}
                    followCursor={true}
                >
                    <IconButton
                        onClick={() => {
                            send("\x03");
                        }}
                    >
                        <span style={{ visibility: isHovered ? "visible" : "hidden" }}>Ⓒ</span>
                    </IconButton>
                </Tooltip>
                <Tooltip
                    title="Send Ctrl-D to microcontroller"
                    sx={{ position: "absolute", bottom: 76, right: 16, zIndex: 1 }}
                    followCursor={true}
                >
                    <IconButton
                        onClick={() => {
                            send("\x04");
                        }}
                    >
                        <span style={{ visibility: isHovered ? "visible" : "hidden" }}>Ⓓ</span>
                    </IconButton>
                </Tooltip>
            </div>
        </>
    );
};

const RawConsole = ({ connect, output, send, ready, config }) => {
    return ready ? (
        <Box sx={{ height: "100%" }}>
            <ScrollableFeed>
                <RawSerialIn output={output} config={config} />
                <RawSerialOut send={send} config={config} />
            </ScrollableFeed>
        </Box>
    ) : (
        <Button onClick={connect}>Connect to Serial Port</Button>
    );
};

export default RawConsole;
