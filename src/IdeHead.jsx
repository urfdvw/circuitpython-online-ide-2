// React
import { useContext } from "react";
import MenuBar from "./layout/Menu";
// Flex layout
import * as FlexLayout from "flexlayout-react";
//context
import ideContext from "./ideContext";

export default function IdeHead() {
    const { flexModel: model, openDirectory, openBackupDirectory, connectToSerialPort } = useContext(ideContext);
    function openTab(name, component) {
        model.doAction(
            FlexLayout.Actions.addNode(
                { type: "tab", name: name, component: component },
                model.getActiveTabset() ? model.getActiveTabset().getId() : model.getRoot().getChildren()[0].getId(), // there should be at least one tabset
                FlexLayout.DockLocation.CENTER,
                -1
            )
        );
    }
    const menuStructure = {
        title: "CircuitPython Online IDE",
        menu: [
            {
                label: "Connect",
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
                options: [
                    {
                        text: "About",
                        handler: () => {
                            openTab("About", "about");
                        },
                    },
                    {
                        text: "Contact Me",
                        handler: () => {
                            openTab("Contact Me", "contact");
                        },
                    },
                ],
            },
        ],
    };
    return <MenuBar menuStructure={menuStructure} />;
}
