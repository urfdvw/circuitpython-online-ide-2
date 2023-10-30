import { useState } from "react";
import "./App.css";
import IdeBody from "./IdeBody";
import { isMobile } from "react-device-detect";
import ErrorIsMoble from "./ErrorIsMoble";
import MenuBar from "./Menu";

function App() {
    const [menuStructure, setMenuStructure] = useState({
        title: "CircuitPython Online IDE",
        menu: [
            {
                label: "connect",
                options: [
                    {
                        text: "CircuitPy Drive",
                        handler: () => {
                            console.log("clicked on CircuitPy");
                        },
                    },
                    {
                        text: "Serial",
                        handler: () => {
                            console.log("clicked on Serial");
                        },
                    },
                ],
            },
            {
                label: "open",
                options: [
                    {
                        text: "Settings",
                        handler: () => {
                            console.log("clicked on Settings");
                        },
                    },
                    {
                        text: "Folder View",
                        handler: () => {
                            console.log("clicked on Folder View");
                        },
                    },
                ],
            },
        ],
    });

    if (isMobile) {
        return <ErrorIsMoble></ErrorIsMoble>;
    }

    return (
        <div className="ide">
            <div className="ide-header">
                <MenuBar menuStructure={menuStructure} />
            </div>
            <div className="ide-body">
                <IdeBody />
            </div>
            <div className="ide-tail">tail</div>
        </div>
    );
}

export default App;
