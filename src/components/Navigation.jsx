// React
import { useContext, useEffect, useState } from "react";
import Typography from "@mui/material/Typography";
//context
import AppContext from "../AppContext";
// mui
import Button from "@mui/material/Button";
// theme
import { NoTheme } from "react-lazy-dark-theme";
// board info
import { fetchLatestCircuitPythonInfo } from "../utilFunctions/baordInfoUtils";
import { compareVersions, versionToString, parseVersion } from "../utilFunctions/installedLibUtils";

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

function InstallCpy() {
    const { boardInfo } = useContext(AppContext);
    const [cpyInfo, setCpyInfo] = useState(null);
    useEffect(() => {
        const fetchCpyInfo = async () => {
            const cpy_info = await fetchLatestCircuitPythonInfo();
            setCpyInfo(cpy_info);
        };
        fetchCpyInfo();
    }, []);

    if (boardInfo && cpyInfo && compareVersions(cpyInfo.version, boardInfo.cpy_version) > 0) {
        return (
            <>
                Step 0.
                <Button
                    onClick={() => {
                        window.open(`https://circuitpython.org/board/${boardInfo.board_id}/`, "_blank");
                    }}
                >
                    Update to {cpyInfo.name}
                </Button>
                (Optional)
            </>
        );
    }

    return (
        <>
            Step 0.
            <Button
                onClick={() => {
                    window.open(
                        "https://learn.adafruit.com/welcome-to-circuitpython/installing-circuitpython",
                        "_blank"
                    );
                }}
            >
                Install CircuitPython
            </Button>
            (Skip if installed recently)
        </>
    );
}

export default function Navigation() {
    const { openDirectory, rootFolderDirectoryReady, serialReady, connectToSerialPort, appConfig } =
        useContext(AppContext);

    return (
        <Typography component="div" sx={{ margin: "20pt" }}>
            <p> Please connect your microcontroller to this computer by a usb data cable before following the steps.</p>
            <ul>
                <li>
                    <InstallCpy />
                </li>
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
                {serialReady && rootFolderDirectoryReady ? (
                    <li>🎉 Setup complete! Open your files and let's start coding!</li>
                ) : (
                    ""
                )}
            </ul>

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
        </Typography>
    );
}
