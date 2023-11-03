/* eslint-disable react/prop-types */

// ace
import { useEffect, useState } from "react";
import AceEditor from "react-ace";
import PopUp from "./PopUp";
import { getFileText, writeFileText } from "react-local-file-system";
import SaveIcon from "@mui/icons-material/Save";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";

export default function IdeEditor({ fileHandle, node }) {
    const [text, setText] = useState("");
    useEffect(() => {
        async function loadText() {
            const fileText = await getFileText(fileHandle);
            setText(fileText);
        }
        loadText();
    }, [fileHandle]);
    const parentHeight = node.getParent()._rect.height - node.getParent()._tabHeaderRect.height;
    return (
        <PopUp title={fileHandle.name} parentStyle={{ height: parentHeight + "px" }}>
            <AceEditor
                value={text}
                height="100%"
                width="100%"
                onChange={(newValue) => {
                    setText(newValue);
                }}
            />
            <Tooltip title="Save and Run" sx={{ position: "absolute", bottom: 16, right: 16, zIndex: 1 }}>
                <IconButton
                    onClick={() => {
                        writeFileText(fileHandle, text);
                    }}
                >
                    <SaveIcon />
                </IconButton>
            </Tooltip>
        </PopUp>
    );
}
