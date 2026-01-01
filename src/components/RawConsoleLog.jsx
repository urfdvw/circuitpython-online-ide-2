// React
import { useEffect, useRef, useContext } from "react";
// context
import AppContext from "../AppContext";
// ACE
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/theme-tomorrow";
import "ace-builds/src-min-noconflict/ext-searchbox";

// Raw Log Window component with auto-scroll on content update
export default function RawConsoleLog() {
    const { serialOutput } = useContext(AppContext);
    const rawLogRef = useRef(null);

    useEffect(() => {
        // Scroll to the last row whenever serialOutput changes
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
    }, [serialOutput]);

    return (
        <AceEditor
            ref={rawLogRef}
            value={serialOutput}
            width="100%"
            height="100%"
            wrapEnabled={true}
            readOnly={true}
        ></AceEditor>
    );
}
