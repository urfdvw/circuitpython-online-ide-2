import { cleanupDebugFiles, getAllPythonFiles, instrumentCode } from "../utilFunctions/debuggerUtils";
import { useContext, useState, useEffect } from "react";
import AppContext from "../AppContext";
import SetDebugWatch from "./SetDebugWatch";

export default function Debugger() {
    const { rootDirHandle } = useContext(AppContext);
    const [pythonFileNames, setPythonFileNames] = useState([]);

    // States managed by parent
    const [debugFileNames, setDebugFileNames] = useState([]);

    // Ensure key "" always exists if you want strictly compliant initialization,
    // though the component handles adding it if missing.
    const [watchExpressions, setWatchExpressions] = useState({});

    return (
        <div>
            <h1>Debugger Component</h1>
            <p>This is a placeholder for the Debugger component.</p>
            <button
                onClick={async () => {
                    // Example usage of debugger utilities
                    const pythonFiles = await getAllPythonFiles(rootDirHandle);
                    setPythonFileNames(pythonFiles);
                    console.log("Python Files:", pythonFiles);
                }}
            >
                Get All Python Files
            </button>
            <button
                onClick={async () => {
                    // Example usage of debugger utilities
                    await cleanupDebugFiles(rootDirHandle);
                }}
            >
                Cleanup Debug Files
            </button>
            <br />
            <button
                onClick={async () => {
                    console.log("Python Files:", pythonFileNames);
                    // Example usage of debugger utilities

                    const filteredWatchExpressions = watchExpressions;

                    for (const key in filteredWatchExpressions) {
                        filteredWatchExpressions[key] = filteredWatchExpressions[key].filter(
                            (expr) => expr.trim() !== ""
                        );
                    }

                    console.log("Watch Expressions:", filteredWatchExpressions);

                    await instrumentCode(rootDirHandle, pythonFileNames, debugFileNames, filteredWatchExpressions);
                }}
            >
                Instrument Code
            </button>
            <SetDebugWatch
                pythonFileNames={pythonFileNames}
                debugFileNames={debugFileNames}
                setDebugFileNames={setDebugFileNames}
                watchExpressions={watchExpressions}
                setWatchExpressions={setWatchExpressions}
            />
        </div>
    );
}
