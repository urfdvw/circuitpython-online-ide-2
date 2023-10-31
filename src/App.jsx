import { useState } from "react";
import "./App.css";
import IdeBody from "./IdeBody";
import { isMobile } from "react-device-detect";
import ErrorIsMobile from "./ErrorIsMobile";
import MenuBar from "./Menu";
import { useFileSystem } from "react-local-file-system";

function App() {
    // get folder handler and status with useFileSystem hook
    const { openDirectory, directoryReady, statusText, rootDirHandle } = useFileSystem();

    const [menuStructure, setMenuStructure] = useState({
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
        return <ErrorIsMobile />;
    }

    return (
        <div className="ide">
            <div className="ide-header">
                <MenuBar menuStructure={menuStructure} />
            </div>
            <div className="ide-body">
                <IdeBody openDirectory={openDirectory} directoryReady={directoryReady} rootDirHandle={rootDirHandle} />
            </div>
            <div className="ide-tail">CircuitPy Drive: {statusText}</div>
        </div>
    );
}

export default App;
