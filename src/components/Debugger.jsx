import {
    cleanupDebugFiles,
    getAllPythonFiles,
    instrumentCode,
    sleep,
    formatBytes,
} from "../utilFunctions/debuggerUtils";
import { useContext, useState, useEffect } from "react";
import AppContext from "../AppContext";
import SetDebugWatch from "./SetDebugWatch";
import * as constants from "../constants";
import DebugCodeView from "./DebugCodeView";
import DebugWatchDisplay from "./DebugWatchDisplay";

export default function Debugger() {
    const { rootDirHandle, sendCtrlC, sendCtrlD, sendDataToSerialPort, serialOutput } = useContext(AppContext);
    const [pythonFileNames, setPythonFileNames] = useState([]);

    // States managed by parent
    const [debugFileNames, setDebugFileNames] = useState([]);

    // Ensure key "" always exists if you want strictly compliant initialization,
    // though the component handles adding it if missing.
    const [watchExpressions, setWatchExpressions] = useState({});

    const [debugHistory, setDebugHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(0);

    useEffect(() => {
        if (!serialOutput.endsWith(constants.DEBUG_OUT_END)) {
            return;
        }
        const lastBlock = serialOutput.split("==== Start Debugging ====").at(-1);
        // console.log("Last Debug Block:", lastBlock);
        const debugLines = lastBlock
            .split(constants.DEBUG_OUT_START)
            .slice(1)
            .map((line) => line.split(constants.DEBUG_OUT_END)[0]);
        // console.log("Parsed Debug Lines:", debugLines);
        const debugLinesObjects = debugLines.map((line) => {
            return JSON.parse(line);
        });
        console.log("Parsed Debug Lines:", debugLinesObjects);
        setDebugHistory(debugLinesObjects);
        setHistoryIndex(debugLinesObjects.length - 1);
    }, [serialOutput]);

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

            <button
                onClick={async () => {
                    sendCtrlC();
                    await sleep(100);
                    sendCtrlC();
                    await sleep(500);
                    sendCtrlD();
                    await sleep(500);
                    sendCtrlC();
                    await sleep(100);
                    sendCtrlC();
                    await sleep(500);
                    sendDataToSerialPort("from ide_debug_code import *" + constants.LINE_END);
                }}
            >
                Restart
            </button>
            <SetDebugWatch
                pythonFileNames={pythonFileNames}
                debugFileNames={debugFileNames}
                setDebugFileNames={setDebugFileNames}
                watchExpressions={watchExpressions}
                setWatchExpressions={setWatchExpressions}
            />
            <br />

            <button
                onClick={async () => {
                    if (historyIndex > 0) {
                        setHistoryIndex((prev) => prev - 1);
                    }
                }}
            >
                {"<< Step"}
            </button>

            <button
                onClick={async () => {
                    if (historyIndex == debugHistory.length - 1) {
                        sendDataToSerialPort("[S]" + constants.LINE_END);
                    } else {
                        setHistoryIndex((prev) => prev + 1);
                    }
                }}
            >
                {"Step >>"}
            </button>

            <button
                onClick={async () => {
                    sendDataToSerialPort("[BP]" + constants.LINE_END);
                }}
            >
                breakpoint
            </button>
            <div style={{ height: "500px", width: "100%" }}>
                {debugHistory && debugHistory.length > 0 && (
                    <>
                        {historyIndex != debugHistory.length - 1 && <span>Time traveling</span>}
                        <DebugWatchDisplay variables={debugHistory.at(historyIndex).watch} />
                        file: {debugHistory.at(historyIndex).file}; free memory:{" "}
                        {formatBytes(debugHistory.at(historyIndex).mem)}; time since last step:{" "}
                        {debugHistory.at(historyIndex).time} ms
                        <DebugCodeView
                            rootDirHandle={rootDirHandle}
                            fileName={debugHistory.at(historyIndex).file}
                            lineNumber={debugHistory.at(historyIndex).line}
                        />
                    </>
                )}
            </div>
        </div>
    );
}
