import { Tooltip, Typography, Box } from "@mui/material";
import AppContext from "../AppContext";
import { useState, useContext, useEffect } from "react";
import DigitalClock from "../utilComponents/DigitalClock";
// Icons
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import DeveloperBoardOutlinedIcon from "@mui/icons-material/DeveloperBoardOutlined";
import { grey, deepPurple, purple, blue, teal } from "@mui/material/colors";

export default function CornerIcons() {
    const { appConfig, rootFolderDirectoryReady, rootFolderStatusText, serialReady } = useContext(AppContext);
    return (
        <Box
            sx={{ height: "100%", alignContent: "center", display: "flex", flexDirection: "row", alignItems: "center" }}
        >
            &nbsp;
            <Tooltip
                title={
                    <>
                        <b>CircuitPy Drive:</b>
                        <br />
                        {rootFolderStatusText}
                    </>
                }
            >
                <FolderOutlinedIcon sx={{ color: rootFolderDirectoryReady ? purple[400] : grey[500] }} />
            </Tooltip>
            &nbsp;
            <Tooltip
                title={
                    <>
                        <b>Serial Port:</b>
                        <br />
                        {serialReady ? "Connected" : "No Port Connected"}
                    </>
                }
            >
                <DeveloperBoardOutlinedIcon sx={{ color: serialReady ? teal[500] : grey[500] }} />
            </Tooltip>
            {appConfig.config.general.show_time ? <DigitalClock /> : <></>}
        </Box>
    );
}
