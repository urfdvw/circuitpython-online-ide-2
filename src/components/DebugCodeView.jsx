import React, { useState, useEffect, useRef, useContext } from "react";
import AceEditor from "react-ace";

import "ace-builds/src-noconflict/mode-python";
import "ace-builds/src-noconflict/theme-tomorrow";
import "ace-builds/src-noconflict/ext-language_tools";

import AppContext from "../AppContext";

const DebugCodeView = ({ rootDirHandle, fileName, lineNumber }) => {
    const { appConfig, fileLookUp, helpTabSelection, configTabSelection, flexModel, sendCtrlC, sendCtrlD, sendCode } =
        useContext(AppContext);

    const config = appConfig.config;
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

                // 1. Clear old breakpoints and classes
                session.clearBreakpoints();
                const lines = content.split("\n");
                lines.forEach((line, idx) => {
                    session.removeGutterDecoration(idx, "breakpoint-comment");
                });

                // 2. Find and highlight rows with breakpoint comments
                const breakpointRegex = /#\s*●/;
                lines.forEach((line, idx) => {
                    if (breakpointRegex.test(line)) {
                        session.addGutterDecoration(idx, "breakpoint-comment");
                    }
                });

                // 3. Set current line breakpoint (Ace uses 0-indexed rows)
                const row = lineNumber - 1;
                session.setBreakpoint(row, "debug-red-dot");

                // 4. Scroll and Focus
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
        
        /* The Blue Right Arrow */
        .ace_gutter-cell.debug-red-dot::before {
          content: "▶";
          position: absolute;
          
          /* Position: 2px from the left edge of the gutter */
          left: 2px; 
          
          /* Vertically centered */
          top: 9px;
          transform: translateY(-50%);
          
          color: #3498db;
          font-size: 18px;
          z-index: 10;
        }

        /* Highlight rows with breakpoint comments in red */
        // .ace_gutter-cell.breakpoint-comment {
        //   background-color: rgba(231, 76, 60, 0.3);
        // }

        .ace_gutter-cell.breakpoint-comment::after {
          content: "●";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          color: #ff0000;
        //   background-color: rgba(231, 76, 60, 0.2);
          pointer-events: none;
        }
      `}</style>

            <AceEditor
                ref={editorRef}
                mode="python"
                theme="tomorrow"
                name="debug_editor"
                width="100%"
                height="100%"
                value={content}
                readOnly={true}
                fontSize={config.editor.font + "pt"}
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
