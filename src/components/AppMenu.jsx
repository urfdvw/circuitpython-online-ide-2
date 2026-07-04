import MenuBar from "../utilComponents/MenuBar";
import { grey, deepPurple } from "@mui/material/colors";
import CornerIcons from "./CornerIcons";
import { openTab, selectTabById } from "../layout/layoutUtils";
import AppContext from "../AppContext";
import { useContext } from "react";

export default function AppMenu() {
    const { flexModel, helpTabSelection, openDirectory, connectToSerialPort, connectToDataSerialPort, appConfig } =
        useContext(AppContext);
    const DARK_PURPLE = deepPurple[500];
    const DARK_GREY = grey[900];

    const menuStructure = [
        {
            label: "CircuitPython Online IDE",
            color: DARK_PURPLE,
            options: [
                {
                    text: "Download IDE",
                    handler: () => {
                        window.open("https://github.com/urfdvw/circuitpython-online-ide-2/releases/latest", "_blank");
                    },
                },
                {
                    text: "GitHub Repo",
                    handler: () => {
                        window.open("https://github.com/urfdvw/circuitpython-online-ide-2", "_blank");
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
        {
            label: "Connect",
            color: DARK_GREY,
            options: [
                {
                    text: "CircuitPy Drive",
                    handler: () => {
                        openDirectory();
                    },
                },
                {
                    text: "Serial Port",
                    handler: () => {
                        connectToSerialPort(appConfig.config.serial_console.fresh_start_serial);
                    },
                },
                {
                    text: "Data Serial Port",
                    handler: () => {
                        connectToDataSerialPort();
                    },
                },
            ],
        },
        {
            label: "Tools",
            color: DARK_GREY,
            options: [
                {
                    text: "Plot",
                    handler: () => {
                        openTab(flexModel, "Plot", "plot");
                    },
                },
                {
                    text: "Library Management",
                    handler: () => {
                        openTab(flexModel, "Library Management", "lib_management");
                    },
                },
                window.location.protocol !== "file:" && {
                    text: "Debugger",
                    handler: () => {
                        openTab(flexModel, "Debugger", "debugger");
                    },
                },
                {
                    text: "AI Agent Bridge",
                    handler: () => {
                        openTab(flexModel, "AI Agent Bridge", "agent_bridge");
                    },
                },
                {
                    text: "Camera",
                    handler: () => {
                        openTab(flexModel, "Camera", "doc_cam");
                    },
                },
                {
                    text: "Backup",
                    handler: () => {
                        openTab(flexModel, "Backup", "backup");
                    },
                },
                {
                    text: "Widgets",
                    handler: () => {
                        openTab(flexModel, "Widgets", "widgets");
                    },
                },
                {
                    text: "Data Serial",
                    handler: () => {
                        openTab(flexModel, "Data Serial", "data_serial_console");
                    },
                },
                {
                    text: "Navigation",
                    handler: () => {
                        openTab(flexModel, "Navigation", "navigation");
                    },
                },
            ].filter((x) => x), // remove undefined
        },
        {
            label: "Help",
            color: DARK_GREY,
            options: [
                {
                    text: "Getting Started",
                    handler: () => {
                        selectTabById(flexModel, "help_tab");
                        helpTabSelection.setTabName("quick_start");
                    },
                },
                {
                    text: "Documentation",
                    handler: () => {
                        window.open(window.location.pathname + window.location.search + "#/docs", "_blank");
                    },
                },
                {
                    text: "Introduction",
                    handler: () => {
                        window.open(window.location.pathname + window.location.search + "#/product", "_blank");
                    },
                },
            ],
        },
    ].filter((x) => x); // remove undefined;
    return <MenuBar menuStructure={menuStructure} additionalElement={<CornerIcons />} />;
}
