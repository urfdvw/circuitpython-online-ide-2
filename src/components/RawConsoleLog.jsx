// React
import { useEffect, useRef, useContext } from "react";
// context
import AppContext from "../AppContext";
// ACE
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-text";
import "ace-builds/src-noconflict/theme-tomorrow";
import "ace-builds/src-min-noconflict/ext-searchbox";

// Raw Log Window component with auto-scroll on content update
export default function RawConsoleLog({ log }) {
    const { serialOutput } = useContext(AppContext);
    // default to the REPL serial output; the data console passes its own log via `log`
    const data = log ?? serialOutput;
    const rawLogRef = useRef(null);

    useEffect(() => {
        // Scroll to the last row whenever the log changes
        if (rawLogRef.current && rawLogRef.current.editor) {
            const editor = rawLogRef.current.editor;
            const session = editor.getSession();
            const lineCount = session.getLength();
            // Get the last line content to find its end position
            const lastLineContent = session.getLine(lineCount - 1);
            const lastColumnPos = lastLineContent ? lastLineContent.length : 0;
            // Move cursor to end of last line
            editor.gotoLine(lineCount, lastColumnPos, false);
            editor.scrollToLine(lineCount - 1, true, true);
        }
    }, [data]);

    return (
        <AceEditor
            ref={rawLogRef}
            mode="text"
            theme="tomorrow"
            value={data}
            width="100%"
            height="100%"
            wrapEnabled={true}
            readOnly={true}
            setOptions={{ useWorker: false }}
        ></AceEditor>
    );
}
