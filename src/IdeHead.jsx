// React
import { useContext } from "react";
import MenuBar from "./layout/Menu";
// MUI
import { grey, deepPurple } from "@mui/material/colors";
// Flex layout
import * as FlexLayout from "flexlayout-react";
//context
import ideContext from "./ideContext";

const wikiBase = "https://github.com/urfdvw/CircuitPython-online-IDE2/wiki/";
const wikiLinks = [
    {
        text: "Quick start",
        link: "Quick-start",
    },
    {
        text: "Layout",
        link: "Layout",
    },
    {
        text: "Folder View",
        link: "Folder-View",
    },
    {
        text: "Editor",
        link: "Editor",
    },
    {
        text: "Serial Console",
        link: "Serial-Console-%28raw%29",
    },
    {
        text: "Settings",
        link: "Settings",
    },
    {
        text: "Plot",
        link: "Plot-%28raw%29",
    },
    {
        text: "Backup",
        link: "Backup",
    },
    {
        text: "...More",
        link: "",
    },
];

export default function IdeHead() {
    const { flexModel: model, openDirectory, openBackupDirectory, connectToSerialPort } = useContext(ideContext);

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

    const menuStructure = {
        menu: [
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
                            window.open("https://github.com/urfdvw/CircuitPython-online-IDE2", "_blank");
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
                ],
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
                            window.open("https://github.com/urfdvw/CircuitPython-online-IDE2/wiki/", "_blank");
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
        ],
    };
    return <MenuBar menuStructure={menuStructure} />;
}
