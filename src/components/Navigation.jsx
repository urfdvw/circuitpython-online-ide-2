// React
import { useContext, useEffect, useState } from "react";
import Typography from "@mui/material/Typography";
//context
import AppContext from "../AppContext";
// mui
import Button from "@mui/material/Button";
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
    const { openDirectory, rootFolderDirectoryReady, serialReady, connectToSerialPort, appConfig, boardInfo } =
        useContext(AppContext);
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
            <ul>
                <li>
                    Step 1. <Button onClick={openDirectory}>Open CircuitPy Drive</Button>
                    {rootFolderDirectoryReady ? "✅" : ""}
                </li>
                <li>
                    Step 2.{" "}
                    <Button
                        onClick={() => {
                            connectToSerialPort(appConfig.config.serial_console.fresh_start_serial);
                        }}
                    >
                        Connect to Serial Port
                    </Button>
                    {serialReady ? "✅" : ""}
                </li>
            </ul>

            {serialReady && rootFolderDirectoryReady && (
                <p>🎉 Setup complete! Open your files and let&apos;s start coding!</p>
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
