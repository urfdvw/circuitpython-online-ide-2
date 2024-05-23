// React
import { useState, useEffect, useContext } from "react";
import MenuBar from "./layout/Menu";
// MUI
import { grey, deepPurple, purple, blue, teal } from "@mui/material/colors";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
// Icons
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import DeveloperBoardOutlinedIcon from "@mui/icons-material/DeveloperBoardOutlined";
import FolderCopyOutlinedIcon from "@mui/icons-material/FolderCopyOutlined";
// Flex layout
import * as FlexLayout from "flexlayout-react";
//context
import ideContext from "./ideContext";

export default function IdeHead() {
    const {
        showDevFeatures,
        showBetaFeatures,
        flexModel: model,
        openDirectory,
        openBackupDirectory,
        connectToSerialPort,
        rootFolderDirectoryReady,
        rootFolderStatusText,
        serialReady,
        backupDirectoryReady,
        backupStatusText,
        lastBackupTime,
        config,
    } = useContext(ideContext);

    const [time, setTime] = useState("");
    const [timeFull, setTimeFull] = useState("");
    useEffect(() => {
        const interval = setInterval(() => {
            var date = new Date();
            setTime(date.toLocaleTimeString([], { timeStyle: "short" }).slice(0, -3));
            setTimeFull(date.toLocaleString());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    function findTabByName(node, name) {
        if (node.getType() === "tab" && node.getName() === name) {
            return node;
        }
        if (node.getChildren) {
            for (let child of node.getChildren()) {
                const found = findTabByName(child, name);
                if (found) return found;
            }
        }
        return null;
    }

    function openTab(name, component) {
        const tabNode = findTabByName(model.getRoot(), name);
        if (tabNode instanceof FlexLayout.TabNode) {
            // Activate the found tab
            model.doAction(FlexLayout.Actions.selectTab(tabNode.getId()));
        } else {
            // Open a new tab
            model.doAction(
                FlexLayout.Actions.addNode(
                    {
                        type: "tab",
                        name: name,
                        component: component,
                    },
                    model.getActiveTabset()
                        ? model.getActiveTabset().getId()
                        : model.getRoot().getChildren()[0].getId(),
                    FlexLayout.DockLocation.CENTER,
                    -1
                )
            );
        }
    }

    const menuStructure = [
        {
            label: "CircuitPython Online IDE",
            color: deepPurple[500],
            options: [
                {
                    text: "About",
                    handler: () => {
                        openTab("About", "about");
                    },
                },
                {
                    text: "GitHub Repo",
                    handler: () => {
                        window.open("https://github.com/urfdvw/circuitpython-online-ide-2", "_blank");
                    },
                },
            ],
        },
        {
            label: "Connect",
            color: grey[900],
            options: [
                {
                    text: "CircuitPy Drive",
                    handler: () => {
                        console.log("clicked on `CircuitPy Drive`");
                        openDirectory();
                    },
                },
                {
                    text: "Serial Port",
                    handler: () => {
                        console.log("clicked on Serial");
                        connectToSerialPort();
                    },
                },
                {
                    text: "Backup Folder",
                    handler: () => {
                        console.log("clicked on `Backup Folder`");
                        openBackupDirectory();
                    },
                },
            ],
        },
        {
            label: "Tools",
            color: grey[900],
            options: [
                {
                    text: "Navigation",
                    handler: () => {
                        openTab("Navigation", "navigation");
                    },
                },
                {
                    text: "Plot",
                    handler: () => {
                        openTab("Plot", "raw_plot");
                    },
                },
                {
                    text: "Backup",
                    handler: () => {
                        openTab("Backup", "backup_drive");
                    },
                },
                showBetaFeatures
                    ? {
                          text: "Widgets (beta)",
                          handler: () => {
                              openTab("Widgets", "widgets");
                          },
                      }
                    : undefined,
                showDevFeatures
                    ? {
                          text: "Debug (dev)",
                          handler: () => {
                              openTab("Debug", "placeholder");
                          },
                      }
                    : undefined,
            ].filter((x) => x), // remove undefined
        },
        {
            label: "Help",
            color: grey[900],
            options: [
                {
                    text: "Quick Start",
                    handler: () => {
                        openTab("Quick Start", "quick_start");
                    },
                },
                {
                    text: "Help & Learn",
                    handler: () => {
                        window.open("https://github.com/urfdvw/circuitpython-online-ide-2/wiki/", "_blank");
                    },
                },
                {
                    text: "Feedback",
                    handler: () => {
                        window.open(
                            "https://docs.google.com/forms/d/e/1FAIpQLSdupiJIRViFwPpuQC1hMp8gRvhxACLoAjgepm_-IRZumwK7Cg/viewform",
                            "_blank"
                        );
                    },
                },
            ],
        },
    ].filter((x) => x); // remove undefined;

    return (
        <div
            style={{
                display: "flex",
                justifyContent: "space-between",
                borderBottom: "2px solid rgb(239,239,239)",
                width: "100%",
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "left",
                    flex: 1,
                }}
            >
                <MenuBar menuStructure={menuStructure} />
            </div>
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "left",
                    paddingRight: "10pt",
                }}
            >
                <Tooltip
                    title={
                        <>
                            <b>CircuitPy Drive:</b>
                            <br />
                            {rootFolderStatusText}
                        </>
                    }
                >
                    &nbsp;
                    <FolderOutlinedIcon sx={{ color: rootFolderDirectoryReady ? purple[400] : grey[500] }} />
                </Tooltip>
                <Tooltip
                    title={
                        <>
                            <b>Serial Port:</b>
                            <br />
                            {serialReady ? "Connected" : "No Port Connected"}
                        </>
                    }
                >
                    &nbsp;
                    <DeveloperBoardOutlinedIcon sx={{ color: serialReady ? teal[500] : grey[500] }} />
                </Tooltip>
                {backupDirectoryReady ? (
                    <Tooltip
                        title={
                            <>
                                <b>Backup Folder:</b>
                                <br />
                                {backupStatusText}
                                <br />
                                {lastBackupTime}
                            </>
                        }
                    >
                        &nbsp;
                        <FolderCopyOutlinedIcon sx={{ color: blue[600] }} />
                    </Tooltip>
                ) : (
                    <></>
                )}
                {config.global.show_time ? (
                    <Tooltip title={timeFull}>
                        &nbsp;
                        <Typography component={"span"}>{time}</Typography>
                    </Tooltip>
                ) : (
                    <></>
                )}
            </div>
        </div>
    );
}
