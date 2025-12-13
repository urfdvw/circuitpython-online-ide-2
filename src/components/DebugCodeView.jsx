import React, { useState, useEffect, useRef } from "react";
import AceEditor from "react-ace";

import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/theme-tomorrow";
import "ace-builds/src-noconflict/ext-language_tools";

const DebugCodeView = ({ rootDirHandle, fileName, lineNumber }) => {
    const [content, setContent] = useState("");
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(true);
    const editorRef = useRef(null);

    // 1. File Loading Logic
    useEffect(() => {
        let isMounted = true;
        const fetchFileContent = async () => {
            try {
                setLoading(true);
                setError(false);
                // Clear content immediately so we don't show old code while loading new
                setContent("");

                if (!rootDirHandle || !fileName) {
                    throw new Error("Missing directory handle or filename");
                }

                const fileHandle = await rootDirHandle.getFileHandle(fileName);
                const file = await fileHandle.getFile();
                const text = await file.text();

                if (isMounted) {
                    setContent(text);
                    setLoading(false);
                }
            } catch (err) {
                console.error("Failed to load file:", err);
                if (isMounted) {
                    setError(true);
                    setLoading(false);
                }
            }
        };

        fetchFileContent();
        return () => {
            isMounted = false;
        };
    }, [rootDirHandle, fileName]);

    // 2. Breakpoint & Scrolling Logic
    useEffect(() => {
        // Only run if we are done loading and have no errors
        if (!loading && !error && editorRef.current) {
            // We use a small timeout to ensure React-Ace has finished
            // rendering the new 'content' into the internal session.
            const timer = setTimeout(() => {
                const editor = editorRef.current.editor;
                const session = editor.getSession();

                // 1. Clear old breakpoints
                session.clearBreakpoints();

                // 2. Set new breakpoint (Ace uses 0-indexed rows)
                const row = lineNumber - 1;
                session.setBreakpoint(row, "debug-red-dot");

                // 3. Scroll and Focus
                editor.gotoLine(lineNumber, 0, true);
                editor.scrollToLine(lineNumber, true, true, function () {});
            }, 50); // 50ms delay is usually sufficient to bypass the race condition

            return () => clearTimeout(timer);
        }
    }, [lineNumber, loading, error, content]);

    if (error) {
        return (
            <div style={styles.placeholder}>
                <h3 style={{ color: "#e74c3c" }}>Unable to open file</h3>
                <p>
                    Could not read <strong>{fileName}</strong>
                </p>
            </div>
        );
    }

    if (loading) {
        return (
            <div style={styles.placeholder}>
                <p>Loading {fileName}...</p>
            </div>
        );
    }

    return (
        <div style={{ width: "100%", height: "100%", position: "relative" }}>
            <style>{`
        /* Target the specific gutter cell class we added */
        .ace_gutter-cell.debug-red-dot {
          position: relative;
        }
        
        /* The Red Dot */
        .ace_gutter-cell.debug-red-dot::before {
          content: "";
          position: absolute;
          
          /* Position: 8px from the left edge of the gutter */
          left: 5px; 
          
          /* Vertically centered */
          top: 50%;
          transform: translateY(-50%);
          
          width: 8px;
          height: 8px;
          background-color: #e74c3c;
          border-radius: 50%;
          z-index: 10;
        }
      `}</style>

            <AceEditor
                ref={editorRef}
                mode="javascript"
                theme="tomorrow"
                name="debug_editor"
                width="100%"
                height="100%"
                value={content}
                readOnly={true}
                fontSize={14}
                showPrintMargin={false}
                showGutter={true}
                highlightActiveLine={true}
                setOptions={{
                    useWorker: false,
                    displayIndentGuides: true,
                    fixedWidthGutter: true,
                }}
            />
        </div>
    );
};

const styles = {
    placeholder: {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f5f5f5",
        color: "#333",
        fontFamily: "sans-serif",
    },
};

export default DebugCodeView;
