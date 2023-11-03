/* eslint-disable react/prop-types */

// ace
import { useState } from "react";
import AceEditor from "react-ace";
import PopUp from "./PopUp";

export default function IdeEditor({ fileKey, fileLookUp, setFileLookUp }) {
    const [text, setText] = useState("");
    return (
        <PopUp title={fileLookUp[fileKey].handle.name}>
            <AceEditor
                value={text}
                onChange={(newValue) => {
                    setText(newValue);
                }} // this will make the editor very slow
            />
        </PopUp>
    );
}
