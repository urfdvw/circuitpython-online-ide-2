import {
    cleanupDebugFiles,
    getAllPythonFiles,
    instrumentCode,
    sleep,
    formatBytes,
} from "../utilFunctions/debuggerUtils";
import { useContext, useState, useEffect } from "react";
import AppContext from "../AppContext";
import DebugWatchSet from "./DebugWatchSet";
import * as constants from "../constants";
import DebugCodeView from "./DebugCodeView";
import DebugWatchDisplay from "./DebugWatchDisplay";
import TabTemplate from "../utilComponents/TabTemplate";
import { Button, Backdrop, CircularProgress, Box, Typography, Tooltip } from "@mui/material";
import { selectTabById } from "../layout/layoutUtils";
import { grey, deepPurple, red, blue } from "@mui/material/colors";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import EjectIcon from "@mui/icons-material/Eject";
import IconButton from "@mui/material/IconButton";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import FastForwardIcon from "@mui/icons-material/FastForward";
import Divider from "@mui/material/Divider";
import MemoryIcon from "@mui/icons-material/Memory";
import TimerIcon from "@mui/icons-material/Timer";

const ICON_RED = red[600];
const ICON_PURPLE = deepPurple[400];
const ICON_DISABLED = grey[400];
const ICON_BLUE = blue[600];

export default function Debugger() {
    const {
        rootDirHandle,
        rootFolderDirectoryReady,
        serialReady,
        sendCtrlC,
        sendCtrlD,
        sendDataToSerialPort,
        serialOutput,
        flexModel,
        helpTabSelection,
    } = useContext(AppContext);

    const [pythonFileNames, setPythonFileNames] = useState([]);
    const [debugFileNames, setDebugFileNames] = useState([]);
    const [watchExpressions, setWatchExpressions] = useState({});
    const [conditionalBreakpoints, setConditionalBreakpoints] = useState({});

    const [debugHistory, setDebugHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(0);

    const [pageIndex, setPageIndex] = useState(2);
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
        // console.log("Parsed Debug Lines:", debugLinesObjects);
        setDebugHistory(debugLinesObjects);
        setHistoryIndex(debugLinesObjects.length - 1);
    }, [serialOutput]);

    const started = debugHistory.length > 0;
    const viewingLatest = started ? historyIndex === debugHistory.length - 1 : true;

    // console.log(started, viewingLatest);

    async function cleanUpState() {
        // clean up states from previous debug session
        sendCtrlC();
        setDebugHistory([]);
        setHistoryIndex(0);
        setFirstStart(true);
    }

    async function handleStartConfigPage() {
        if (!rootFolderDirectoryReady) {
            alert("Please open CIRCUITPY drive first.");
            return;
        }

        const pythonFiles = await getAllPythonFiles(rootDirHandle);
        setPythonFileNames(pythonFiles);
        console.log("Python Files:", pythonFiles);
        setPageIndex(1);
    }

    async function handleStartDebuggerPage() {
        if (!rootFolderDirectoryReady) {
            alert("Please open CIRCUITPY drive first.");
            return;
        }
        if (debugFileNames.length === 0) {
            alert("Please select at least one file to debug.");
            return;
        }

        await cleanUpState();

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

    var title =
        pageIndex === 0 ? "Information" : pageIndex === 1 ? "Configuration" : viewingLatest ? "Debugger" : "History";

    const menuStructure =
        pageIndex === 0
            ? [
                  {
                      text: "Start",
                      handler: handleStartConfigPage,
                      color: deepPurple[500],
                  },
              ]
            : pageIndex === 1
            ? [
                  {
                      text: "Run Debugger",
                      handler: handleStartDebuggerPage,
                      color: deepPurple[500],
                  },
              ]
            : [
                  {
                      text: firstStart ? "Start" : "Restart",
                      color: deepPurple[500],
                      handler: async () => {
                          if (!serialReady) {
                              alert("Please connect to Serial Console first.");
                              return;
                          }
                          if (!rootFolderDirectoryReady) {
                              alert("Please open CIRCUITPY drive first.");
                              return;
                          }
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
                      text: "ReInstrument",
                      handler: handleStartDebuggerPage,
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
                    You can also add this comment by clicking on the row number in the code editor. For a multi-line
                    code row, please add the comment to the first row, such as:
                </Typography>
                <Typography component="pre" sx={{ backgroundColor: "#f5f5f5", p: "10px" }}>
                    {"x = [# breakpoint\n    i * 100\n    for i in range(10)\n    if i % 2 == 0\n]"}
                </Typography>

                <Typography component="p" variant="h6" paragraph>
                    Limitations
                </Typography>

                <Typography component="p" paragraph>
                    Currently, only root level Python files (files directly under CIRCUITPY drive) are supported.
                </Typography>

                <Typography component="p" paragraph>
                    The debugger will consume additional memory on your device. If you encounter memory issues, consider
                    reducing the number of files being debugged or simplifying your watch expressions.
                </Typography>

                <Typography component="p" paragraph>
                    The debugger doesn't support SAMD21(M0) chips due to the lack of json module in CircuitPython for
                    these chips. This chip is also very memory constrained and not recommended in general.
                </Typography>
            </Box>
        );
    }

    function configPage() {
        return (
            <>
                <DebugWatchSet
                    pythonFileNames={pythonFileNames}
                    debugFileNames={debugFileNames}
                    setDebugFileNames={setDebugFileNames}
                    watchExpressions={watchExpressions}
                    setWatchExpressions={setWatchExpressions}
                    conditionalBreakpoints={conditionalBreakpoints} 
                    setConditionalBreakpoints={setConditionalBreakpoints}
                />
            </>
        );
    }

    function debuggerPage() {
        return (
            <>
                <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
                    <Box
                        sx={{
                            width: "100%",
                            borderBottom: "1px solid grey",
                            display: "flex",
                            direction: "row",
                            alignItems: "center",
                            gap: "0px",
                            p: "0px",
                        }}
                    >
                        <Tooltip title={viewingLatest ? "Step" : "Step: Forward to latest to continue debugging."} placement="top">
                            <span>
                                <IconButton
                                    onClick={async () => {
                                        sendDataToSerialPort("[S]" + constants.LINE_END);
                                    }}
                                    disabled={!viewingLatest}
                                >
                                    <SkipNextIcon
                                        sx={{ color: viewingLatest ? ICON_PURPLE : ICON_DISABLED }}
                                        fontSize="small"
                                    />
                                </IconButton>
                            </span>
                        </Tooltip>

                        <Tooltip
                            title={viewingLatest ? "Continue" : "Continue: Forward to latest to continue debugging."} placement="top"
                        >
                            <span>
                                <IconButton
                                    onClick={async () => {
                                        sendDataToSerialPort("[C]" + constants.LINE_END);
                                    }}
                                    disabled={!viewingLatest}
                                >
                                    <EjectIcon
                                        sx={{
                                            transform: "rotate(90deg)",
                                            color: viewingLatest ? ICON_PURPLE : ICON_DISABLED,
                                        }}
                                        fontSize="small"
                                    />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Divider orientation="vertical" flexItem />
                        <Tooltip title="Rewind" placement="top">
                            <IconButton
                                onClick={async () => {
                                    if (historyIndex > 0) {
                                        setHistoryIndex((prev) => prev - 1);
                                    }
                                }}
                            >
                                <PlayArrowIcon sx={{ transform: "rotate(180deg)", color: ICON_RED }} fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Forward" placement="top">
                            <span>
                                <IconButton
                                    onClick={async () => {
                                        setHistoryIndex((prev) => prev + 1);
                                    }}
                                    disabled={viewingLatest}
                                >
                                    <PlayArrowIcon
                                        sx={{ color: viewingLatest ? ICON_DISABLED : ICON_RED }}
                                        fontSize="small"
                                    />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title="Forward to latest" placement="top">
                            <span>
                                <IconButton
                                    onClick={async () => {
                                        setHistoryIndex(debugHistory.length - 1);
                                    }}
                                    disabled={viewingLatest}
                                >
                                    <FastForwardIcon
                                        sx={{ color: viewingLatest ? ICON_DISABLED : ICON_RED }}
                                        fontSize="small"
                                    />
                                </IconButton>
                            </span>
                        </Tooltip>

                        <Divider orientation="vertical" flexItem />
                        {debugHistory && debugHistory.length > 0 && (
                            <>
                                <Tooltip title="free memory" placement="top">
                                    <span>
                                        <IconButton disabled>
                                            <MemoryIcon sx={{ color: ICON_BLUE }} fontSize="small" />
                                            <Typography component="span">
                                                {formatBytes(debugHistory.at(historyIndex).m)}
                                            </Typography>
                                        </IconButton>
                                    </span>
                                </Tooltip>
                                <Tooltip title="time since last pause" placement="top">
                                    <span>
                                        <IconButton disabled>
                                            <TimerIcon sx={{ color: ICON_BLUE }} fontSize="small" />
                                            <Typography component="span">
                                                {debugHistory.at(historyIndex).t} ms
                                            </Typography>
                                        </IconButton>
                                    </span>
                                </Tooltip>
                            </>
                        )}
                    </Box>

                    <Box sx={{ width: "100%", maxHeight: "40%", overflow: "auto" }}>
                        {debugHistory && debugHistory.length > 0 && (
                            <DebugWatchDisplay variables={debugHistory.at(historyIndex).w} />
                        )}
                    </Box>
                    <Box sx={{ width: "100%" }}>
                        {debugHistory && debugHistory.length > 0 && (
                            <>
                                <Typography component="p">{debugHistory.at(historyIndex).f}</Typography>
                            </>
                        )}
                    </Box>
                    <Box sx={{ flexGrow: 1, overflow: "auto" }}>
                        {debugHistory && debugHistory.length > 0 && (
                            <DebugCodeView
                                rootDirHandle={rootDirHandle}
                                fileName={debugHistory.at(historyIndex).f}
                                lineNumber={debugHistory.at(historyIndex).l}
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
