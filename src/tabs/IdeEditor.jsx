/* eslint-disable react/prop-types */

// ace
import { useEffect, useState, useRef } from "react";
import AceEditor from "react-ace";
import PopUp from "../layout/PopUp";
import { getFileText, writeFileText } from "react-local-file-system";
import SaveIcon from "@mui/icons-material/Save";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import "ace-builds/src-noconflict/mode-python";
import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/mode-markdown";
import "ace-builds/src-noconflict/theme-tomorrow";

export default function IdeEditor({ fileHandle, node, config }) {
    const aceEditorRef = useRef(null);
    const [text, setText] = useState("");
    useEffect(() => {
        async function loadText() {
            const fileText = await getFileText(fileHandle);
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

    if (aceEditorRef.current !== null) {
        // add key bindings
        aceEditorRef.current.editor.commands.addCommand({
            name: "save",
            bindKey: { win: "Ctrl-S", mac: "Command-S" },
            exec: () => {
                saveFile(text);
            },
        });
    }

    return (
        <PopUp title={fileHandle.name} parentStyle={{ height: parentHeight + "px" }}>
            <AceEditor
                ref={aceEditorRef}
                mode={mode}
                theme="tomorrow"
                value={text}
                height="100%"
                width="100%"
                onChange={(newValue) => {
                    setText(newValue);
                }}
                fontSize={config.editor.font + "pt"}
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
