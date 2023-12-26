// MUI
import Box from "@mui/material/Box";
// Other packages
import ScrollableFeed from "react-scrollable-feed"; // https://stackoverflow.com/a/52673227/7037749
// Mine
import { removeInBetween } from "./textProcessor";
import * as constants from "./constants";
// command
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-python";
import "ace-builds/src-noconflict/theme-tomorrow";
import { useState } from "react";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import SendIcon from "@mui/icons-material/Send";

const rawSerialBoxStyles = {
    bgcolor: "background.paper",
    borderColor: "text.primary",
    m: 1,
    padding: "10px",
    height: "100%",
};

const RawSerialIn = ({ output, config }) => {
    if (config.raw_console.hide_title) {
        output = removeInBetween(output, constants.TITLE_START, constants.TITLE_END);
    }

    if (config.raw_console.hide_cv) {
        output = removeInBetween(output, constants.CV_JSON_START, constants.CV_JSON_END);
    }

    return <pre style={{ whiteSpace: "pre-wrap" }}>{output}</pre>;
};

const RawSerialOut = ({ send }) => {
    const [mode, setMode] = useState("python");
    const [text, setText] = useState("");

    return (
        <>
            <AceEditor
                mode={mode}
                theme="tomorrow"
                value={text}
                width="100%"
                maxLines={"Infinity"}
                onChange={(newValue) => {
                    setText(newValue);
                }}
            />
            <Tooltip title="Send to microcontroller" sx={{ position: "absolute", bottom: 16, right: 36, zIndex: 1 }}>
                <IconButton
                    onClick={() => {
                        send(text + "\x0D");
                        setText("");
                    }}
                >
                    <SendIcon />
                </IconButton>
            </Tooltip>
        </>
    );
};

const RawConsole = ({ output, config, send }) => {
    return (
        <Box sx={rawSerialBoxStyles}>
            <ScrollableFeed>
                <RawSerialIn output={output} config={config} />
                <RawSerialOut send={send} />
            </ScrollableFeed>
        </Box>
    );
};

export default RawConsole;
