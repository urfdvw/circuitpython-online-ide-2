import { cleanupDebugFiles, getAllPythonFiles, instrumentCode } from "../utilFunctions/debuggerUtils";
import { useContext } from "react";
import AppContext from "../AppContext";

export default function Debugger() {
    const { rootDirHandle } = useContext(AppContext);
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
        </div>
    );
}
