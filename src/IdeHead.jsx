// React
import { useContext } from "react";
import MenuBar from "./layout/Menu";

//context
import ideContext from "./ideContext";
export default function IdeHead() {
    const { openDirectory, connectToSerialPort } = useContext(ideContext);
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
                options: [],
            },
        ],
    };
    return <MenuBar menuStructure={menuStructure} />;
}
