/* eslint-disable react/prop-types */

// ace
import { useState } from "react";
import AceEditor from "react-ace";
import NewWindow from "react-new-window";

export default function IdeEditor({ fileKey, fileLookUp, setFileLookUp }) {
    const [popped, setPopped] = useState(false);
    const [text, setText] = useState("");
    return popped ? (
        <>
            <button
                onClick={() => {
                    setPopped(false);
                }}
            >
                dock the window
            </button>
            <NewWindow
                title={fileLookUp[fileKey].handle.name}
                onUnload={() => {
                    setPopped(false);
                }}
            >
                <AceEditor
                    value={text}
                    onChange={(newValue) => {
                        setText(newValue);
                    }} // this will make the editor very slow
                />
            </NewWindow>
        </>
    ) : (
        <>
            <button
                onClick={() => {
                    setPopped(true);
                }}
            >
                pop the window
            </button>
            <AceEditor
                value={text}
                onChange={(newValue) => {
                    setText(newValue);
                }} // this will make the editor very slow
            />
        </>
    );
}
