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
        appConfig,
        rootDirHandle,
        rootFolderDirectoryReady,
        serialReady,
        sendCtrlC,
        sendCtrlD,
        sendDataToSerialPort,
        serialOutput,
        flexModel,
        helpTabSelection,
        instrumentationOutdated,
        setInstrumentationOutdated,
    } = useContext(AppContext);

    const [pythonFileNames, setPythonFileNames] = useState([]);
    const [debugFileNames, setDebugFileNames] = useState([]);
    const [watchExpressions, setWatchExpressions] = useState({});
    const [conditionalBreakpoints, setConditionalBreakpoints] = useState({});

    const [debugHistory, setDebugHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(0);

    const [pageIndex, setPageIndex] = useState(1);
    const [loadingInfo, setLoadingInfo] = useState("");
    const [debuggerRunning, setDebuggerRunning] = useState(false);
    const [debuggerHalted, setDebuggerHalted] = useState(false);

    useEffect(() => {
        if (!rootFolderDirectoryReady) {
            setPageIndex(0);
        } else {
            handleStartConfigPage();
        }

        const originalSetting = appConfig.config.serial_console.auto_scroll;
        appConfig.setConfigField("serial_console", "auto_scroll", true);
        return () => {
            appConfig.setConfigField("serial_console", "auto_scroll", originalSetting);
        };
    }, []); // initialize config page

    useEffect(() => {
        // for auto re instrumentation
        setInstrumentationOutdated(true);
    }, [debugFileNames, watchExpressions, conditionalBreakpoints]);

    useEffect(() => {
        // for debugging
        console.log("debuggerHalted:", debuggerHalted);
    }, [debuggerHalted]);

    useEffect(() => {
        // detect debugger stopped
        if (serialOutput.endsWith("\n>>> ")) {
            setDebuggerRunning(false);
        }
    }, [serialOutput, setDebuggerRunning]);

    useEffect(() => {
        // get debug history
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

    const hasHistory = debugHistory.length > 0;
    const viewingLatest = historyIndex === debugHistory.length - 1;
    const viewingFirst = historyIndex === 0;

    const canRunCode = debuggerRunning && debuggerHalted && viewingLatest;
    const canRewind = hasHistory && (!debuggerRunning || debuggerHalted) && !viewingFirst;
    const canForward = hasHistory && (!debuggerRunning || debuggerHalted) && !viewingLatest;

    async function cleanUpState() {
        // clean up states from previous debug session
        sendCtrlC();
        setDebugHistory([]);
        setHistoryIndex(0);
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
        if (debugFileNames.length === 0) {
            alert("Please select at least one file to debug.");
            return;
        }
        setPageIndex(2);
        await startDebugging();
    }

    async function instrumentCodeProcess() {
        if (!rootFolderDirectoryReady) {
            alert("Please open CIRCUITPY drive first.");
            return;
        }

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
        setInstrumentationOutdated(false);
    }

    const startDebugging = async () => {
        if (instrumentationOutdated) {
            await instrumentCodeProcess();
        }
        if (!serialReady) {
            alert("Please connect to Serial Console first.");
            return;
        }
        if (!rootFolderDirectoryReady) {
            alert("Please open CIRCUITPY drive first.");
            return;
        }

        await cleanUpState();

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

        setDebuggerRunning(true);
    };

    function helpHandler() {
        selectTabById(flexModel, "help_tab");
        helpTabSelection.setTabName("debugger");
    }

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
            ? []
            : pageIndex === 1
            ? [
                  {
                      text: "Run Debugger",
                      handler: async () => {
                          handleStartDebuggerPage();
                      },
                  },
              ]
            : [
                  {
                      text: "Config",
                      handler: handleStartConfigPage,
                  },
              ];
    menuStructure.push({
        label: "≡",
        options: [
            pageIndex == 2 && {
                text: "ReInstrument", // TODO: should be auto re-instrument on code/config change
                handler: instrumentCodeProcess,
            },
            pageIndex == 1 && {
                text: "refresh file list",
                handler: handleStartConfigPage,
            },
            pageIndex !== 2 && {
                text: "clean up debug files",
                handler: async () => {
                    await cleanupDebugFiles(rootDirHandle);
                },
            },
            {
                text: "Help",
                handler: helpHandler,
            },
        ].filter(Boolean),
    });

    function infoPage() {
        return (
            <Box sx={{ p: "20px" }}>
                <Typography component="p" variant="h5" paragraph>
                    Debugger
                </Typography>
                <Button variant="contained" size="large" onClick={handleStartConfigPage} sx={{ mr: "10px" }}>
                    Start
                </Button>
                <Button variant="outlined" size="large" onClick={helpHandler}>
                    Help
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
                                    disabled={!canRunCode}
                                >
                                    <SkipNextIcon
                                        sx={{ color: canRunCode ? ICON_PURPLE : ICON_DISABLED }}
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
                                    disabled={!canRunCode}
                                >
                                    <EjectIcon
                                        sx={{
                                            transform: "rotate(90deg)",
                                            color: canRunCode ? ICON_PURPLE : ICON_DISABLED,
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
                                    disabled={!canRunCode}
                                >
                                    <EjectOutlinedIcon
                                        sx={{
                                            transform: "rotate(90deg)",
                                            color: canRunCode ? ICON_PURPLE : ICON_DISABLED,
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
                                    disabled={!canRewind}
                                >
                                    <FastForwardIcon
                                        sx={{
                                            transform: "rotate(180deg)",
                                            color: canRewind ? ICON_RED : ICON_DISABLED,
                                        }}
                                        fontSize="small"
                                    />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title="Rewind" placement="top">
                            <span>
                                <IconButton
                                    onClick={async () => {
                                        if (historyIndex > 0) {
                                            setHistoryIndex((prev) => prev - 1);
                                        }
                                    }}
                                    disabled={!canRewind}
                                >
                                    <PlayArrowIcon
                                        sx={{
                                            transform: "rotate(180deg)",
                                            color: canRewind ? ICON_RED : ICON_DISABLED,
                                        }}
                                        fontSize="small"
                                    />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title="Forward" placement="top">
                            <span>
                                <IconButton
                                    onClick={async () => {
                                        setHistoryIndex((prev) => prev + 1);
                                    }}
                                    disabled={!canForward}
                                >
                                    <PlayArrowIcon
                                        sx={{ color: canForward ? ICON_RED : ICON_DISABLED }}
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
                                    disabled={!canForward}
                                >
                                    <FastForwardIcon
                                        sx={{ color: canForward ? ICON_RED : ICON_DISABLED }}
                                        fontSize="small"
                                    />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Divider orientation="vertical" flexItem />
                    </Box>

                    <Box sx={{ width: "100%", maxHeight: "40%", overflow: "auto" }}>
                        {debugHistory && debugHistory.length > 0 && (
                            <DebugWatchDisplay variables={debugHistory.at(historyIndex).w} />
                        )}
                    </Box>
                    <Box sx={{ width: "100%" }}>
                        {debugHistory && debugHistory.length > 0 ? (
                            <>
                                <Typography component="p">{debugHistory.at(historyIndex).f}</Typography>
                            </>
                        ) : (
                            <Typography>Preparing ...</Typography>
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
                    <Box sx={{ width: "100%" }}>
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
