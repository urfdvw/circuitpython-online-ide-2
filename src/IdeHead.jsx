// React
import { useContext } from "react";
import MenuBar from "./layout/Menu";
// Flex layout
import * as FlexLayout from "flexlayout-react";
//context
import ideContext from "./ideContext";

export default function IdeHead() {
    const { flexModel: model, openDirectory, connectToSerialPort } = useContext(ideContext);
    const menuStructure = {
        title: "CircuitPython Online IDE",
        menu: [
            {
                label: "connect",
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
                ],
            },
            {
                label: "open",
                options: [
                    {
                        text: "Navigation",
                        handler: () => {
                            model.doAction(
                                FlexLayout.Actions.addNode(
                                    { type: "tab", name: "navigation", component: "navigation" },
                                    model.getActiveTabset().getId(),
                                    FlexLayout.DockLocation.CENTER,
                                    -1
                                )
                            );
                        },
                    },
                ],
            },
        ],
    };
    return <MenuBar menuStructure={menuStructure} />;
}
