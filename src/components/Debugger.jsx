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
import TabTemplate from "../utilComponents/TabTemplate";
import { Button, Backdrop, CircularProgress, Box, Typography } from "@mui/material";

export default function Debugger() {
    const { rootDirHandle, sendCtrlC, sendCtrlD, sendDataToSerialPort, serialOutput } = useContext(AppContext);

    const [pythonFileNames, setPythonFileNames] = useState([]);
    const [debugFileNames, setDebugFileNames] = useState([]);
    const [watchExpressions, setWatchExpressions] = useState({});

    const [debugHistory, setDebugHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(0);

    const [pageIndex, setPageIndex] = useState(0);
    const [loadingInfo, setLoadingInfo] = useState("");

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

    async function handleStartConfigPage() {
        const pythonFiles = await getAllPythonFiles(rootDirHandle);
        setPythonFileNames(pythonFiles);
        console.log("Python Files:", pythonFiles);
        setPageIndex(1);
    }

    async function handleStartDebuggerPage() {
        setLoadingInfo("Instrumenting code for debugging...");

        const filteredWatchExpressions = watchExpressions;
        for (const key in filteredWatchExpressions) {
            filteredWatchExpressions[key] = filteredWatchExpressions[key].filter((expr) => expr.trim() !== "");
        }
        console.log("Watch Expressions:", filteredWatchExpressions);
        await instrumentCode(rootDirHandle, pythonFileNames, debugFileNames, filteredWatchExpressions);

        setLoadingInfo("");
        setPageIndex(2);
    }

    const menuStructure = [];

    function infoPage() {
        return (
            <>
                <Button onClick={handleStartConfigPage}>Start</Button>
            </>
        );
    }

    function configPage() {
        return (
            <>
                <SetDebugWatch
                    pythonFileNames={pythonFileNames}
                    debugFileNames={debugFileNames}
                    setDebugFileNames={setDebugFileNames}
                    watchExpressions={watchExpressions}
                    setWatchExpressions={setWatchExpressions}
                />
                <Button onClick={handleStartDebuggerPage}>Start</Button>
            </>
        );
    }

    function debuggerPage() {
        return (
            <>
                <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
                    <Box sx={{ width: "100%", borderBottom: "1px solid grey" }}>
                        <Button onClick={handleStartConfigPage}>Config</Button>
                        <Button
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
                        </Button>

                        <Button
                            onClick={async () => {
                                if (historyIndex > 0) {
                                    setHistoryIndex((prev) => prev - 1);
                                }
                            }}
                        >
                            {"<< Step"}
                        </Button>

                        <Button
                            onClick={async () => {
                                if (historyIndex == debugHistory.length - 1) {
                                    sendDataToSerialPort("[S]" + constants.LINE_END);
                                } else {
                                    setHistoryIndex((prev) => prev + 1);
                                }
                            }}
                        >
                            {"Step >>"}
                        </Button>

                        <Button
                            onClick={async () => {
                                sendDataToSerialPort("[BP]" + constants.LINE_END);
                            }}
                        >
                            breakpoint
                        </Button>
                    </Box>
                    <Box sx={{ width: "100%" }}>
                        {debugHistory && debugHistory.length > 0 && (
                            <>
                                {historyIndex != debugHistory.length - 1 && <span>Time traveling</span>}
                                <DebugWatchDisplay variables={debugHistory.at(historyIndex).watch} />
                                file: {debugHistory.at(historyIndex).file}; free memory:{" "}
                                {formatBytes(debugHistory.at(historyIndex).mem)}; time since last step:{" "}
                                {debugHistory.at(historyIndex).time} ms
                            </>
                        )}
                    </Box>
                    <Box sx={{ flexGrow: 1, overflow: "auto" }}>
                        {debugHistory && debugHistory.length > 0 && (
                            <DebugCodeView
                                rootDirHandle={rootDirHandle}
                                fileName={debugHistory.at(historyIndex).file}
                                lineNumber={debugHistory.at(historyIndex).line}
                            />
                        )}
                    </Box>
                </Box>
            </>
        );
    }

    return (
        <TabTemplate title="Debugger" menuStructure={menuStructure}>
            <Backdrop sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }} open={loadingInfo.length > 0}>
                <Box sx={{ display: "flex", flexDirection: "row", gap: "10px" }}>
                    <CircularProgress color="inherit" />
                    <Typography component="p">{loadingInfo}</Typography>
                </Box>
            </Backdrop>
            {pageIndex === 0 && infoPage()}
            {pageIndex === 1 && configPage()}
            {pageIndex === 2 && debuggerPage()}
        </TabTemplate>
    );
}
