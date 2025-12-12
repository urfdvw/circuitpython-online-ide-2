import { cleanupDebugFiles, getAllPythonFiles, instrumentCode } from "../utilFunctions/debuggerUtils";
import { useContext, useState } from "react";
import AppContext from "../AppContext";
import SetDebugWatch from "./SetDebugWatch"

export default function Debugger() {
    const { rootDirHandle } = useContext(AppContext);
    const pythonFileNames = ["main.py", "utils.py", "sensor.py"];

    // States managed by parent
    const [debugFileNames, setDebugFileNames] = useState(["main.py"]);

    // Ensure key "" always exists if you want strictly compliant initialization,
    // though the component handles adding it if missing.
    const [watchExpressions, setWatchExpressions] = useState({
        "": ["x + y"], // Global watch
        "main.py": ["cnt"], // Scoped watch
    });
    return (
        <div>
            <h1>Debugger Component</h1>
            <p>This is a placeholder for the Debugger component.</p>
            <button
                onClick={async () => {
                    // Example usage of debugger utilities
                    const pythonFiles = await getAllPythonFiles(rootDirHandle);
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
                    const pythonFiles = await getAllPythonFiles(rootDirHandle);
                    console.log("Python Files:", pythonFiles);
                    // Example usage of debugger utilities
                    await instrumentCode(rootDirHandle, pythonFiles, pythonFiles, {
                        "my_module.py": ["x"],
                        "": ["__name__", "y"],
                    });
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
