// React
import { useState, useEffect, useCallback } from "react";
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
import { useFileSystem, backupFolder } from "./react-local-file-system";
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
    // main directory for folderView
    const { openDirectory, directoryReady, statusText, rootDirHandle } = useFileSystem();
    // backup directory
    const {
        openDirectory: openBackupDirectory,
        statusText: backupStatusText,
        rootDirHandle: backupDirectoryDirHandle,
    } = useFileSystem();
    const [lastBackupTime, setLastBackupTime] = useState(null);
    // serial
    const { connectToSerialPort, sendDataToSerialPort, clearSerialOutput, serialOutput, serialReady, serialTitle } =
        useSerial();
    // config
    const { config, set_config, ready: configReady } = useConfig(schemas);
    // flex layout
    const [flexModel, setFlexModel] = useState(FlexLayout.Model.fromJson(layout));
    // confirm leave
    useEffect(() => {
        // https://stackoverflow.com/a/47477519/7037749
        if (directoryReady) {
            window.onbeforeunload = function (e) {
                var dialogText = "Are you sure to leave?"; // TODO: not shown up yet
                e.returnValue = dialogText;
                return dialogText;
            };
        }
    }, [directoryReady]);
    // backup schedule
    const backup = useCallback(async () => {
        if (await backupDirectoryDirHandle.isSameEntry(rootDirHandle)) {
            console.log(backupDirectoryDirHandle.name);
            console.log(rootDirHandle.name);
            console.error("Cannot backup to the folder itself.");
            confirm("Cannot backup to the folder itself.");
            return;
        }
        if (!(backupDirectoryDirHandle && rootDirHandle)) {
            return;
        }
        await backupFolder(rootDirHandle, backupDirectoryDirHandle, configReady && config.backup.clean);
        const now = new Date().toLocaleTimeString();
        setLastBackupTime(now);
        console.log("backed up at " + now);
    }, [backupDirectoryDirHandle, rootDirHandle, configReady && config.backup.clean]);
    useEffect(() => {
        const interval = setInterval(async () => {
            if (!(configReady && config.backup.enable_schedule)) {
                return;
            }
            backup();
        }, 60000 * (configReady && config.backup.period));
        return () => clearInterval(interval);
    }, [backup, configReady && config.backup.enable_schedule, configReady && config.backup.period]);

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
                openBackupDirectory: openBackupDirectory,
                backupStatusText: backupStatusText,
                backup: backup,
                lastBackupTime: lastBackupTime,
                connectToSerialPort: connectToSerialPort,
                sendDataToSerialPort: sendDataToSerialPort,
                clearSerialOutput: clearSerialOutput,
                serialOutput: serialOutput,
                serialReady: serialReady,
                serialTitle: serialTitle,
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
                    {serialReady
                        ? serialTitle && config.global.serial_status === "title"
                            ? serialTitle
                            : "Connected"
                        : "No Port Connected"}
                </div>
            </div>
        </ideContext.Provider>
    );
}

export default App;
