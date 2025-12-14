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
import { selectTabById } from "../layout/layoutUtils";

export default function Debugger() {
    const { rootDirHandle, sendCtrlC, sendCtrlD, sendDataToSerialPort, serialOutput, flexModel, helpTabSelection } =
        useContext(AppContext);

    const [pythonFileNames, setPythonFileNames] = useState([]);
    const [debugFileNames, setDebugFileNames] = useState([]);
    const [watchExpressions, setWatchExpressions] = useState({});

    const [debugHistory, setDebugHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(0);

    const [pageIndex, setPageIndex] = useState(0);
    const [loadingInfo, setLoadingInfo] = useState("");
    const [firstStart, setFirstStart] = useState(true);

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

    const started = debugHistory.length > 0;
    const viewingLatest = started ? historyIndex === debugHistory.length - 1 : true;

    console.log(started, viewingLatest);

    async function handleStartConfigPage() {
        // clean up states from previous debug session
        sendCtrlC();
        setDebugHistory([]);
        setHistoryIndex(0);
        setFirstStart(true);

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

    var title = pageIndex === 0 ? "Information" : pageIndex === 1 ? "Configuration" : "Debugger";
    if (!viewingLatest) {
        title += " (Rewound)";
    }

    const menuStructure =
        pageIndex === 0
            ? [
                  {
                      text: "Start",
                      handler: handleStartConfigPage,
                  },
              ]
            : pageIndex === 1
            ? [
                  {
                      text: "Run Debugger",
                      handler: handleStartDebuggerPage,
                  },
              ]
            : [
                  {
                      text: firstStart ? "Start" : "Restart",
                      handler: async () => {
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

                          setFirstStart(false);
                      },
                  },
                  {
                      text: "Config",
                      handler: handleStartConfigPage,
                  },
              ];
    menuStructure.push({
        label: "≡",
        options: [
            pageIndex !== 2 && {
                text: "clean up debug files",
                handler: async () => {
                    await cleanupDebugFiles(rootDirHandle);
                },
            },
            {
                text: "Help",
                handler: () => {
                    console.log("clicked on menu item `Help`");
                    selectTabById(flexModel, "help_tab");
                    helpTabSelection.setTabName("debugger");
                },
            },
        ].filter(Boolean),
    });

    function infoPage() {
        return (
            <Box sx={{ p: "20px" }}>
                <Typography component="p" variant="h5" paragraph>
                    Debugger
                </Typography>

                <Button variant="contained" size="large" onClick={handleStartConfigPage}>
                    Start
                </Button>
                <Typography component="p" paragraph>
                    Please connect to CIRCUITPY drive and Serial Console before starting the debugger. It is suggested
                    to start a fresh REPL session before starting the debugger.
                </Typography>
                <Typography component="p" paragraph>
                    To start the debugger, click the "Start" button above.
                </Typography>
                <Typography component="p" paragraph>
                    To set a breakpoint, add a inline comment <code># breakpoint</code> to the desired line in your
                    code, such as:
                </Typography>
                <Typography component="pre" sx={{ backgroundColor: "#f5f5f5", p: "10px" }}>
                    {"def my_function():\n    x = 10  # breakpoint\n    return x"}
                </Typography>

                <Typography component="p" paragraph>
                    Note that the debugger will consume additional memory on your device. If you encounter memory
                    issues, consider reducing the number of files being debugged or simplifying your watch expressions.
                    Devices with limited memory resource, such as M0 (SAMD21), may not be able to run the debugger with
                    larger code.
                </Typography>
            </Box>
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
            </>
        );
    }

    function debuggerPage() {
        return (
            <>
                <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
                    <Box sx={{ width: "100%", borderBottom: "1px solid grey" }}>
                        <Button
                            onClick={async () => {
                                if (historyIndex > 0) {
                                    setHistoryIndex((prev) => prev - 1);
                                }
                            }}
                        >
                            {"Rewind"}
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
                            {viewingLatest ? "Step" : "Forward"}
                        </Button>
                        {viewingLatest && (
                            <Button
                                onClick={async () => {
                                    sendDataToSerialPort("[BP]" + constants.LINE_END);
                                }}
                            >
                                breakpoint
                            </Button>
                        )}
                    </Box>

                    <Box sx={{ width: "100%", maxHeight: "40%", overflow: "auto" }}>
                        {debugHistory && debugHistory.length > 0 && (
                            <DebugWatchDisplay variables={debugHistory.at(historyIndex).watch} />
                        )}
                    </Box>
                    <Box sx={{ width: "100%" }}>
                        {debugHistory && debugHistory.length > 0 && (
                            <>
                                <Typography component="p">
                                    free memory: <b>{formatBytes(debugHistory.at(historyIndex).mem)}</b>; time since
                                    last pause: <b>{debugHistory.at(historyIndex).time} ms</b>
                                </Typography>
                                <Typography component="p">
                                    file: <b>{debugHistory.at(historyIndex).file}</b>;
                                </Typography>
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
        <TabTemplate title={title} menuStructure={menuStructure}>
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
