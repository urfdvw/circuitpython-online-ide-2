// React
import { useState } from "react";
// Style
import "./App.css";
// Ide parts
import IdeBody from "./IdeBody";
import IdeHead from "./IdeHead";
// Device Support Warnings
import { isMobile, isMacOs, isSafari, isFirefox, isIE } from "react-device-detect";
import ErrorIsMobile from "./infopages/ErrorIsMobile";
import ErrorIsNotChrome from "./infopages/ErrorIsNotChrome";
import WarningIsMac from "./infopages/WarningIsMac";
// Features
import { useFileSystem } from "react-local-file-system";
import useSerial from "./serial/useSerial";
import DarkTheme from "./react-lazy-dark-theme";
import { useConfig } from "./react-user-config";
import schemas from "./schemas";
// context
import ideContext from "./ideContext";
// layout
import * as FlexLayout from "flexlayout-react";
import layout from "./layout/layout.json";

function App() {
    // get folder handler and status with useFileSystem hook
    const { openDirectory, directoryReady, statusText, rootDirHandle } = useFileSystem();
    const { connectToSerialPort, sendDataToSerialPort, serialOutput, serialReady, serialTitle } = useSerial();
    const { config, set_config, ready: configReady } = useConfig(schemas);
    const [flexModel, setFlexModel] = useState(FlexLayout.Model.fromJson(layout));

    // error info
    let WarningModal = () => {};
    if (isMobile) {
        WarningModal = ErrorIsMobile;
    } else if (isSafari || isFirefox || isIE) {
        WarningModal = ErrorIsNotChrome;
    } else if (isMacOs) {
        WarningModal = WarningIsMac;
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
        <ideContext.Provider
            value={{
                flexModel: flexModel,
                openDirectory: openDirectory,
                directoryReady: directoryReady,
                rootDirHandle: rootDirHandle,
                connectToSerialPort: connectToSerialPort,
                sendDataToSerialPort: sendDataToSerialPort,
                serialOutput: serialOutput,
                serialReady: serialReady,
                schemas: schemas,
                config: config,
                set_config: set_config,
            }}
        >
            <WarningModal />
            <div className="ide">
                <DarkTheme dark={dark} />
                <div className="ide-header">
                    <IdeHead />
                </div>
                <div className="ide-body">
                    <IdeBody />
                </div>
                <div className="ide-tail">
                    CircuitPy Drive: {statusText} | Serial:{" "}
                    {serialReady ? (serialTitle ? serialTitle : "Connected") : "No Port Connected"}
                </div>
            </div>
        </ideContext.Provider>
    );
}

export default App;
