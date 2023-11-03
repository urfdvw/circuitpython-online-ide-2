/* eslint-disable react/prop-types */

// ace
import { useState } from "react";
import AceEditor from "react-ace";
import PopUp from "./PopUp";

export default function IdeEditor({ fileKey, fileLookUp, setFileLookUp, node }) {
    const [text, setText] = useState("");
    const parentHeight = node.getParent()._rect.height - node.getParent()._tabHeaderRect.height;
    return (
        <PopUp title={fileLookUp[fileKey].handle.name} parentStyle={{ height: parentHeight + "px" }}>
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
