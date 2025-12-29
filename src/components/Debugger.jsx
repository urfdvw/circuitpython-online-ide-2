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
import EjectOutlinedIcon from "@mui/icons-material/EjectOutlined";
import IconButton from "@mui/material/IconButton";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import FastForwardIcon from "@mui/icons-material/FastForward";
import Divider from "@mui/material/Divider";
import MemoryIcon from "@mui/icons-material/Memory";
import TimerIcon from "@mui/icons-material/Timer";
import ReplayIcon from "@mui/icons-material/Replay";
import StopIcon from "@mui/icons-material/Stop";

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

    const [pageIndex, setPageIndex] = useState(0);
    const [loadingInfo, setLoadingInfo] = useState("");
    const [firstStart, setFirstStart] = useState(true);
    const [debuggerRunning, setDebuggerRunning] = useState(false);
    const [debuggerHalted, setDebuggerHalted] = useState(false);

    useEffect(() => {
        console.log("debuggerHalted:", debuggerHalted);
    }, [debuggerHalted]);

    useEffect(() => {
        if (serialOutput.endsWith("\n>>> ")) {
            setDebuggerRunning(false);
        }
    }, [serialOutput, setDebuggerRunning]);

    useEffect(() => {
        if (!serialOutput.endsWith(constants.DEBUG_OUT_END)) {
            return;
        }
        const lastBlock = serialOutput.split(constants.DEBUG_START).at(-1);
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
        setDebuggerHalted(debugLinesObjects.at(-1).h);
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
        await instrumentCode(
            rootDirHandle,
            pythonFileNames,
            debugFileNames,
            filteredWatchExpressions,
            conditionalBreakpoints
        );

        setLoadingInfo("");
        setPageIndex(2);
    }

    const startDebugging = async () => {
        if (!serialReady) {
            alert("Please connect to Serial Console first.");
            return;
        }
        if (!rootFolderDirectoryReady) {
            alert("Please open CIRCUITPY drive first.");
            return;
        }
        await sendCtrlC();
        await sleep(100);
        await sendCtrlC();
        await sleep(500);
        await sendCtrlD();
        await sleep(500);
        await sendCtrlC();
        await sleep(100);
        await sendCtrlC();
        await sleep(500);
        await sendDataToSerialPort("from ide_debug_code import *" + constants.LINE_END);

        setFirstStart(false);
        setDebuggerRunning(true);
    };

    const debuggerTitle = !debuggerRunning
        ? "Stopped"
        : !viewingLatest
        ? "History"
        : debuggerHalted
        ? "Halted"
        : "Running";

    const title = pageIndex === 0 ? "Information" : pageIndex === 1 ? "Configuration" : debuggerTitle;

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
                      handler: async () => {
                          await handleStartDebuggerPage();
                          await startDebugging();
                      },
                      color: deepPurple[500],
                  },
              ]
            : [
                  {
                      text: "ReInstrument", // TODO: should be auto re-instrument on code/config change
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
                <hr />
                <Typography component="p" paragraph>
                    Please connect to CIRCUITPY drive and Serial Console before starting the debugger. It is suggested
                    to start a fresh REPL session before starting the debugger.
                </Typography>
                <Typography component="p" paragraph>
                    To set a breakpoint, click on the gutter (row number area) of the code editor.
                </Typography>
            </Box>
        );
    }

    function mergeObjectOfLists(obj1, obj2) {
        const result = { ...obj1 };

        for (const [key, value] of Object.entries(obj2)) {
            if (result.hasOwnProperty(key)) {
                // Concatenate and deduplicate
                result[key] = [...new Set([...result[key], ...value])];
            } else {
                // Key only exists in the second object
                result[key] = [...value];
            }
        }

        return result;
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
                <Button
                    onClick={() => {
                        setWatchExpressions((prev) => mergeObjectOfLists(prev, conditionalBreakpoints));
                    }}
                >
                    Add conditions to watch
                </Button>
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
                        {debuggerRunning ? (
                            <Tooltip title={"Stop"} placement="top">
                                <span>
                                    <IconButton
                                        onClick={async () => {
                                            sendDataToSerialPort(constants.CTRL_C + constants.LINE_END);
                                        }}
                                    >
                                        <StopIcon sx={{ color: ICON_PURPLE }} fontSize="small" />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        ) : (
                            <Tooltip title={"Restart"} placement="top">
                                <span>
                                    <IconButton onClick={startDebugging}>
                                        <ReplayIcon sx={{ color: ICON_PURPLE }} fontSize="small" />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        )}
                        <Tooltip
                            title={viewingLatest ? "Step" : "Forward to latest to continue debugging."}
                            placement="top"
                        >
                            <span>
                                <IconButton
                                    onClick={async () => {
                                        await sendDataToSerialPort(constants.DEBUG_SIGNAL_S + constants.LINE_END);
                                        setDebuggerHalted(false);
                                    }}
                                    disabled={!(debuggerRunning && viewingLatest)}
                                >
                                    <SkipNextIcon
                                        sx={{ color: debuggerRunning && viewingLatest ? ICON_PURPLE : ICON_DISABLED }}
                                        fontSize="small"
                                    />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip
                            title={viewingLatest ? "Continue and log" : "Forward to latest to continue debugging."}
                            placement="top"
                        >
                            <span>
                                <IconButton
                                    onClick={async () => {
                                        await sendDataToSerialPort(constants.DEBUG_SIGNAL_CW + constants.LINE_END);
                                        setDebuggerHalted(false);
                                    }}
                                    disabled={!(debuggerRunning && viewingLatest)}
                                >
                                    <EjectIcon
                                        sx={{
                                            transform: "rotate(90deg)",
                                            color: debuggerRunning && viewingLatest ? ICON_PURPLE : ICON_DISABLED,
                                        }}
                                        fontSize="small"
                                    />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip
                            title={
                                viewingLatest ? "Continue without logging" : "Forward to latest to continue debugging."
                            }
                            placement="top"
                        >
                            <span>
                                <IconButton
                                    onClick={async () => {
                                        await sendDataToSerialPort(constants.DEBUG_SIGNAL_CO + constants.LINE_END);
                                        setDebuggerHalted(false);
                                    }}
                                    disabled={!(debuggerRunning && viewingLatest)}
                                >
                                    <EjectOutlinedIcon
                                        sx={{
                                            transform: "rotate(90deg)",
                                            color: debuggerRunning && viewingLatest ? ICON_PURPLE : ICON_DISABLED,
                                        }}
                                        fontSize="small"
                                    />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Divider orientation="vertical" flexItem />
                        <Tooltip title="Rewind to beginning" placement="top">
                            <span>
                                <IconButton
                                    onClick={async () => {
                                        setHistoryIndex(0);
                                    }}
                                >
                                    <FastForwardIcon
                                        sx={{
                                            transform: "rotate(180deg)",
                                            color: ICON_RED,
                                        }}
                                        fontSize="small"
                                    />
                                </IconButton>
                            </span>
                        </Tooltip>
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
