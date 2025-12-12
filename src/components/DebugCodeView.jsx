import React, { useState, useEffect, useRef } from "react";
import AceEditor from "react-ace";

// Import necessary ace builds - adjust mode/theme as necessary for your project
import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/theme-monokai";
import "ace-builds/src-noconflict/ext-language_tools";

const DebugCodeView = ({ rootDirHandle, fileName, lineNumber }) => {
    const [content, setContent] = useState("");
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(true);
    const editorRef = useRef(null);

    useEffect(() => {
        let isMounted = true;

        const fetchFileContent = async () => {
            try {
                setLoading(true);
                setError(false);

                if (!rootDirHandle || !fileName) {
                    throw new Error("Missing directory handle or filename");
                }

                // Get the file handle from the directory handle
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

    // Handle Scrolling and Focus when content or lineNumber changes
    useEffect(() => {
        if (editorRef.current && !loading && !error) {
            const editor = editorRef.current.editor;
            // Ace uses 1-based indexing for gotoLine
            editor.gotoLine(lineNumber, 0, true);
            editor.scrollToLine(lineNumber, true, true, function () {});
        }
    }, [lineNumber, loading, error, content]);

    // Placeholder View
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

    // Create the "Red Dot" indicator using Ace Markers
    // Ace markers use 0-indexed rows
    const markers = [
        {
            startRow: lineNumber - 1,
            startCol: 0,
            endRow: lineNumber - 1,
            endCol: 1, // Determines width of the marker
            className: "debug-red-dot-marker",
            type: "text",
        },
    ];

    // Optional: Highlight the full active line
    const annotations = [
        {
            row: lineNumber - 1,
            column: 0,
            type: "error", // Uses default red 'x' icon, or customize via CSS
            text: "Current Execution Point",
        },
    ];

    return (
        <div style={{ width: "100%", height: "100%" }}>
            <AceEditor
                ref={editorRef}
                mode="javascript" // You might want to detect extension to set this dynamically
                theme="monokai"
                name="debug_editor"
                width="100%"
                height="100%"
                value={content}
                readOnly={true}
                fontSize={14}
                showPrintMargin={false}
                showGutter={true}
                highlightActiveLine={true}
                markers={markers}
                // Annotations put icons in the gutter
                annotations={annotations}
                setOptions={{
                    useWorker: false,
                    displayIndentGuides: true,
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
        backgroundColor: "#2b2b2b",
        color: "#ccc",
        fontFamily: "sans-serif",
    },
};

export default DebugCodeView;
