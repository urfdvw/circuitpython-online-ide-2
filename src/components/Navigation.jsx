// React
import { useContext, useEffect, useState } from "react";
import Typography from "@mui/material/Typography";
//context
import AppContext from "../AppContext";
// mui
import Button from "@mui/material/Button";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Stack from "@mui/material/Stack";
// add table imports
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
// theme
import { NoTheme } from "react-lazy-dark-theme";
// board info
import { fetchLatestCircuitPythonInfo } from "../utilFunctions/boardInfoUtils";
import { compareVersions, versionToString } from "../utilFunctions/version";
// board file access
import { FILE_SOURCE } from "../hooks/useFileSource";
import useStorageControl from "../hooks/useStorageControl";

const video_parent_css = {
    position: "relative",
    width: "100%",
    height: 0,
    paddingTop: (9 / 16) * 100 + "%",
};

const video_css = {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    width: "100%",
    height: "100%",
};

export default function Navigation() {
    const {
        openDirectory,
        rootFolderDirectoryReady,
        serialReady,
        connectToSerialPort,
        appConfig,
        boardInfo,
        serial,
        fileSource,
        setFileSource,
    } = useContext(AppContext);
    const { queryState, switchToBoard, switchToHost, busy, storageControlDialog } = useStorageControl(
        serial,
        serialReady
    );
    const usingSerial = fileSource === FILE_SOURCE.SERIAL;
    const setupComplete = serialReady && (usingSerial || rootFolderDirectoryReady);
    const [cpyInfo, setCpyInfo] = useState(null);
    useEffect(() => {
        const fetchCpyInfo = async () => {
            const cpy_info = await fetchLatestCircuitPythonInfo();
            setCpyInfo(cpy_info);
        };
        fetchCpyInfo();
    }, []);

    return (
        <Typography component="div" sx={{ margin: "20pt" }}>
            <p>
                Please connect your microcontroller to this computer by a <b>USB data cable</b> before following the
                steps.
            </p>
            <p>
                If you have not installed CircuitPython on your microcontroller, please check{" "}
                <a href="https://learn.adafruit.com/welcome-to-circuitpython/installing-circuitpython" target="_blank">
                    <b>this tutorial</b>
                </a>{" "}
                first.
            </p>
            <p>
                <b>Step 1.</b> Choose how the IDE reads and writes files on your board.
            </p>
            <ToggleButtonGroup
                exclusive
                size="small"
                value={usingSerial ? FILE_SOURCE.SERIAL : FILE_SOURCE.MASS_STORAGE}
                onChange={(event, value) => {
                    // Switching closes open editor tabs, and useFileSourceTabs owns
                    // both that and the unsaved-work confirmation: the same setting
                    // can also be changed from the settings form, so the guard has
                    // to live where every path meets rather than on this button.
                    if (value) {
                        setFileSource(value);
                    }
                }}
                sx={{ marginBottom: "8px" }}
            >
                <ToggleButton value={FILE_SOURCE.MASS_STORAGE} sx={{ textTransform: "none" }}>
                    USB mass storage
                </ToggleButton>
                <ToggleButton value={FILE_SOURCE.SERIAL} sx={{ textTransform: "none" }}>
                    USB serial
                </ToggleButton>
            </ToggleButtonGroup>
            <p style={{ marginTop: 0 }}>
                {usingSerial ? (
                    <small>
                        Files are read and written over the REPL. Use this when the CIRCUITPY drive is not
                        available. It is slower and it interrupts a running program: saving restarts your code
                        afterwards, while browsing leaves the board at the REPL. The file list does not refresh
                        on its own, so use the ⟳ button in Folder View.
                    </small>
                ) : (
                    <small>
                        Files are read and written through the CIRCUITPY drive mounted on this computer. This is
                        the fastest option and is recommended whenever the drive shows up.
                    </small>
                )}
            </p>

            {!usingSerial && (
                <p>
                    <b>Step 2.</b> <Button onClick={openDirectory}>Open CircuitPy Drive</Button>
                    {rootFolderDirectoryReady ? "✅" : ""}
                </p>
            )}
            <p>
                <b>Step {usingSerial ? 2 : 3}.</b>{" "}
                <Button
                    onClick={() => {
                        connectToSerialPort(appConfig.config.serial_console.fresh_start_serial);
                    }}
                >
                    Connect to Serial Port
                </Button>
                {serialReady ? "✅" : ""}
                {usingSerial && !serialReady && <small> (required for board files)</small>}
            </p>

            {setupComplete && <p>🎉 Setup complete! Open your files and let&apos;s start coding!</p>}

            {/*
                Serial mode only. In mass-storage mode the IDE reads files through
                the mounted drive, so handing write access to the board would make
                CIRCUITPY vanish from this computer and kill rootDirHandle,
                taking Folder View, every open editor tab, Backup and the Debugger
                with it. The explanation below only makes sense for serial anyway.
            */}
            {usingSerial && (
                <>
                    <h4 style={{ marginBottom: "4px" }}>Filesystem write access</h4>
                    <p style={{ marginTop: 0 }}>
                        <small>
                            Only one side can write to the board at a time. While the CIRCUITPY drive is
                            mounted here, this computer owns write access and saving over serial fails. These
                            are manual tools: each one talks to the board and interrupts a running program, so
                            nothing runs until you press a button.
                        </small>
                    </p>
                    <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1 }}>
                        <Button variant="outlined" size="small" disabled={busy} onClick={queryState}>
                            Query current state
                        </Button>
                        <Button
                            variant="outlined"
                            size="small"
                            color="warning"
                            disabled={busy}
                            onClick={switchToBoard}
                        >
                            Give write access to CircuitPython
                        </Button>
                        <Button variant="outlined" size="small" disabled={busy} onClick={switchToHost}>
                            Return write access to this computer
                        </Button>
                    </Stack>
                    {storageControlDialog}
                </>
            )}

            <NoTheme style={{ width: "100%" }}>
                <div style={video_parent_css}>
                    <iframe
                        style={video_css}
                        src="https://www.youtube.com/embed/kq554m21G4A?si=xLRUJNfd6tvAqGuH&cc_load_policy=1&cc_lang_pref=en"
                        title="Quick Start Guide"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                    ></iframe>
                </div>
            </NoTheme>

            {boardInfo && cpyInfo && compareVersions(cpyInfo.version, boardInfo.cpy_version) > 0 && (
                <Typography component="div">
                    <p>
                        ⬆️ New CircuitPython version {versionToString(cpyInfo.version)} is available!{" "}
                        <a href={`https://circuitpython.org/board/${boardInfo.board_id}/`} target="_blank">
                            <b>Click here to upgrade.</b>
                        </a>
                    </p>
                    <TableContainer component={Paper} sx={{ marginTop: 2 }}>
                        <Table size="small" aria-label="board info">
                            <TableHead>
                                <TableRow>
                                    <TableCell></TableCell>
                                    <TableCell>
                                        <strong>CPy Version</strong>
                                    </TableCell>
                                    <TableCell>
                                        <strong>Update Date</strong>
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <TableRow>
                                    <TableCell component="th" scope="row">
                                        Currently installed
                                    </TableCell>
                                    <TableCell component="th" scope="row">
                                        {versionToString(boardInfo.cpy_version)}
                                    </TableCell>
                                    <TableCell>{boardInfo.cpy_datetime}</TableCell>
                                </TableRow>
                            </TableBody>
                            <TableBody>
                                <TableRow>
                                    <TableCell component="th" scope="row">
                                        Latest available
                                    </TableCell>
                                    <TableCell component="th" scope="row">
                                        {versionToString(cpyInfo.version)}
                                    </TableCell>
                                    <TableCell>{cpyInfo.datetime}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Typography>
            )}
            <Button
                onClick={() => {
                    window.open(
                        "https://docs.google.com/forms/d/e/1FAIpQLSdupiJIRViFwPpuQC1hMp8gRvhxACLoAjgepm_-IRZumwK7Cg/viewform",
                        "_blank"
                    );
                }}
                variant="contained"
                sx={{ mt: "25px" }}
            >
                Submit Feedback
            </Button>
        </Typography>
    );
}
