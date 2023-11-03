/* eslint-disable react/prop-types */

// ace
import { useEffect, useState } from "react";
import AceEditor from "react-ace";
import PopUp from "./PopUp";
import { getFileText } from "react-local-file-system";

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
        </PopUp>
    );
}
