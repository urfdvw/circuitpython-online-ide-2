import { useState } from "react";
import "./App.css";
import IdeBody from "./IdeBody";
import { isMobile } from "react-device-detect";
import ErrorIsMobile from "./ErrorIsMobile";
import MenuBar from "./Menu";
import { useFileSystem } from "react-local-file-system";
import useSerial from "./useSerial";
import DarkTheme from "react-lazy-dark-theme";
import { useConfig } from "react-user-config";
import global_config_schema from "./schemas/global.json";
import editor_config_schema from "./schemas/editor.json";

function App() {
    // get folder handler and status with useFileSystem hook
    const { openDirectory, directoryReady, statusText, rootDirHandle } = useFileSystem();
    const { connectToSerialPort, sendDataToSerialPort, serialOutput, isSerialPortConnected } = useSerial();
    const schemas = [global_config_schema, editor_config_schema];
    const { config, set_config, ready: configReady } = useConfig(schemas);

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
                            connectToSerialPort();
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

    // If config initialization not done, don't continue.
    if (!configReady) {
        return;
    }
    // theme config
    var dark = null;
    if (config.global.theme === "light") {
        dark = false;
    } else if (config.global.theme === "dark") {
        dark = true;
    }

    return (
        <div className="ide">
            <DarkTheme dark={dark} />
            <div className="ide-header">
                <MenuBar menuStructure={menuStructure} />
            </div>
            <div className="ide-body">
                <IdeBody
                    openDirectory={openDirectory}
                    directoryReady={directoryReady}
                    rootDirHandle={rootDirHandle}
                    connectToSerialPort={connectToSerialPort}
                    sendDataToSerialPort={sendDataToSerialPort}
                    serialOutput={serialOutput}
                    isSerialPortConnected={isSerialPortConnected}
                    schemas={schemas}
                    config={config}
                    set_config={set_config}
                />
            </div>
            <div className="ide-tail">
                CircuitPy Drive: {statusText} | Serial: {isSerialPortConnected ? "connected" : "not connected"}
            </div>
        </div>
    );
}

export default App;
