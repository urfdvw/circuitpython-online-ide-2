import MenuBar from "../utilComponents/MenuBar";
import { grey, deepPurple } from "@mui/material/colors";
import CornerIcons from "./CornerIcons";
import { openTab, selectTabById } from "../layout/layoutUtils";
import AppContext from "../AppContext";
import React, { useContext } from "react";

export default function AppMenu() {
    const { flexModel, helpTabSelection, openDirectory, connectToSerialPort } = useContext(AppContext);
    const DARK_PURPLE = deepPurple[500];
    const DARK_GREY = grey[900];

    const menuStructure = [
        {
            label: "CircuitPython Online IDE",
            color: DARK_PURPLE,
            options: [
                {
                    text: "About",
                    handler: () => {
                        console.log("clicked on menu item `About`");
                        selectTabById(flexModel, "help_tab");
                        helpTabSelection.setTabName("about");
                    },
                },
                {
                    text: "Download IDE",
                    handler: () => {
                        console.log("clicked on menu item `Download IDE`");
                        // window.open("https://github.com/urfdvw/circuitpython-online-ide-2", "_blank");
                    },
                },
                {
                    text: "GitHub Repo",
                    handler: () => {
                        console.log("clicked on menu item `GitHub Repo`");
                        window.open("https://github.com/urfdvw/circuitpython-online-ide-2", "_blank");
                    },
                },
                {
                    text: "Feedback",
                    handler: () => {
                        console.log("clicked on menu item `Feedback`");
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
                        console.log("clicked on menu item `CircuitPy Drive`");
                        openDirectory();
                    },
                },
                {
                    text: "Serial Port",
                    handler: () => {
                        console.log("clicked on menu item `Serial`");
                        connectToSerialPort();
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
                        console.log("clicked on menu item `Plot`");
                        // openTab("Plot", "raw_plot");
                    },
                },
                {
                    text: "Backup",
                    handler: () => {
                        console.log("clicked on menu item `Backup`");
                        openTab(flexModel, "Backup", "backup");
                    },
                },
                {
                    text: "Camera",
                    handler: () => {
                        console.log("clicked on menu item `Camera`");
                        openTab(flexModel, "Camera", "doc_cam");
                    },
                },
                {
                    text: "Widgets",
                    handler: () => {
                        console.log("clicked on menu item `Widgets`");
                        //   openTab("Widgets", "widgets");
                    },
                },
                {
                    text: "Navigation",
                    handler: () => {
                        console.log("clicked on menu item `Navigation`");
                        openTab(flexModel, "Navigation", "navigation");
                    },
                },
                // showDevFeatures
                //     ? {
                //           text: "Widgets (dev)",
                //           handler: () => {
                //               console.log("clicked on menu item ``");
                //               //   openTab("Widgets", "widgets");
                //           },
                //       }
                //     : undefined,
            ].filter((x) => x), // remove undefined
        },
        {
            text: "Help",
            color: DARK_GREY,
            handler: () => {
                console.log("clicked on menu item `Help`");
                selectTabById(flexModel, "help_tab");
                helpTabSelection.setTabName("quick_start");
            },
        },
    ].filter((x) => x); // remove undefined;
    return <MenuBar menuStructure={menuStructure} additionalElement={<CornerIcons />} />;
}
