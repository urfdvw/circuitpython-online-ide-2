import { useState, useEffect } from "react";
// App
import "./App.css";
import AppContext from "./AppContext";
// layout
import * as FlexLayout from "flexlayout-react";
import layout from "./layout/layout.json";
import Factory from "./layout/Factory";
import "flexlayout-react/style/light.css";
// menu bar
import AppMenu from "./components/AppMenu";
// config
import { useConfig } from "./utilComponents/react-user-config";
import schemas from "./configs";
// help
import { useTabValueName } from "./utilComponents/TabedPages";
import docs from "./docs";
// hot keys
import useLayoutHotKeys from "./hotKeys/useLayoutHotKeys";
// theme
import DarkTheme from "react-lazy-dark-theme";
// channel
import useChannel from "./utilHooks/useChannel";
// device support
import { isMobile, isSafari, isFirefox } from "react-device-detect";
import ProductPage from "./components/ProductPage";
// file system
import { useFileSystem } from "./utilComponents/react-local-file-system";
import { getFromPath } from "./utilComponents/react-local-file-system/utilities/fileSystemUtils";
import useEditorTabs from "./hooks/useEditorTabs";
// serial
import { useSerial, useSerialCommands } from "./hooks/useSerial";
// Board info
import { parseCircuitPythonInfo } from "./utilFunctions/dataProcessing";
// version info
import WhatSNew from "./components/WhatSNew";

function App() {
    if (isMobile || isSafari || isFirefox) {
        return <ProductPage />;
    }

    useEffect(() => {
        document.body.style.overflow = "hidden";
    }, []);

    // testing state
    const [testCount, setTestCount] = useState(0);
    // layout
    const [flexModel, setFlexModel] = useState(FlexLayout.Model.fromJson(layout));
    // config
    const configTabSelection = useTabValueName(schemas);
    const appConfig = useConfig(schemas);
    // useEffect(() => {
    //     console.log("config", appConfig);
    // }, [appConfig]); // debug
    // help
    const helpTabSelection = useTabValueName(docs);
    // useEffect(() => {
    //     console.log("helpTabSelection", helpTabSelection);
    // }, [helpTabSelection]); // debug
    // hot keys
    useLayoutHotKeys(flexModel);
    // channel
    const { showDevFeatures, showBetaFeatures } = useChannel();
    useEffect(() => {
        console.log("[showDevFeatures, showBetaFeatures]", [showDevFeatures, showBetaFeatures]);
    }, [showDevFeatures, showBetaFeatures]);
    // file system
    // main directory for folderView
    const {
        openDirectory,
        directoryReady: rootFolderDirectoryReady,
        statusText: rootFolderStatusText,
        rootDirHandle,
    } = useFileSystem();
    const { onFileClick, fileLookUp } = useEditorTabs(flexModel);
    // backup folder
    const {
        openDirectory: openBackupDirectory,
        directoryReady: backupFolderDirectoryReady,
        statusText: backupFolderStatusText,
        rootDirHandle: backupDirHandle,
    } = useFileSystem();
    // serial
    const { connectToSerialPort, sendDataToSerialPort, addToSerialOutput, serialOutput, serialReady, serial } =
        useSerial();
    const { sendCtrlC, sendCtrlD, sendCode, codeHistory } = useSerialCommands(
        sendDataToSerialPort,
        serialOutput,
        serialReady
    );
    // Board info
    const [boardInfo, setBoardInfo] = useState(null);
    useEffect(() => {
        async function getBoardInfo() {
            if (!rootFolderDirectoryReady) {
                setBoardInfo(null);
                return;
            }
            const boot_out_txt = await getFromPath(rootDirHandle, "boot_out.txt");
            const board_info = parseCircuitPythonInfo(boot_out_txt);
            console.log("board_info:", board_info);
            setBoardInfo(board_info);
        }
        getBoardInfo();
    }, [rootFolderDirectoryReady, rootDirHandle]);
    // Debugger
    const [instrumentationOutdated, setInstrumentationOutdated] = useState(true);

    /**** main logic ****/
    if (!appConfig.ready) {
        return;
    }

    if (appConfig.config.general.show_board_id && boardInfo) {
        document.title = "CPy: " + boardInfo.board_id.split("_").join(" ");
    }

    // theme config
    let dark = null;
    let highContrast = false;
    if (appConfig.config.general.theme === "light") {
        dark = false;
    } else if (appConfig.config.general.theme === "dark") {
        dark = true;
    }

    return (
        <AppContext.Provider
            value={{
                // placeholder
                testCount,
                setTestCount,
                // IDE general
                flexModel,
                // config
                appConfig,
                configTabSelection,
                // help
                helpTabSelection,
                // folder
                openDirectory,
                rootFolderDirectoryReady,
                rootDirHandle,
                rootFolderStatusText,
                onFileClick,
                fileLookUp,
                // backup folder
                openBackupDirectory,
                backupFolderDirectoryReady,
                backupFolderStatusText,
                backupDirHandle,
                // serial
                connectToSerialPort,
                sendDataToSerialPort,
                addToSerialOutput,
                serialOutput,
                serialReady,
                serial,
                sendCtrlC,
                sendCtrlD,
                sendCode,
                codeHistory,
                // board info
                boardInfo,
                // debugger
                instrumentationOutdated,
                setInstrumentationOutdated,
            }}
        >
            <DarkTheme dark={dark} highContrast={highContrast} />
            <WhatSNew
                text={`

            ## Version 2.3.0
Released on December 31th, 2025

- Debugger
    - Debugger tool
    - Editor change to set breakpoints
- Serial Console raw log

## Version 2.2.3
Released on November 29th, 2025

- Library Management related enhancement
    - Skip examples in the bundle
    - Added descriptions to list and search
    
## Version 2.2.2
Released on October 30th, 2025

Significant updates from version 2.2.1 include:
- Board Information related enhancement
    - Added an option to use device ID as title
    - Added CircuitPython upgrade information in the Navigation page.
    - Re-organized Navigation page

## Version 2.2.1
Released on October 30th, 2025

Significant updates from version 2.2.0 include:
- Serial console related enhancement and bug fix
    - will reconnect when re-plug in microcontroller
    - terminal will remain if connection lost
    - always dark theme option
    - option to soft reboot or not
    - will block sending code snippet if
        - code incomplete
        - repl not ready

## Version 2.2.0
Released on September 16th, 2025

Significant updates from version 2.1.0 include:
- Lib Management tool

## Version 2.1.0
Released on July 18th, 2025

Significant updates from version 2.0.0 Beta.3 include:
- Serial Console rewrote with Xterm
- Progressive Web App
- Performance improvement and bug fixes

## Version 2.0.0 Beta.3
Released on July 12th, 2025

Significant updates from version 2.0.0 Beta.2 include:
- major rewrite all code
- help and settings shortcuts in tabs
- plot compatible with mu
- refreshed backup tool

## Version 2.0.0 Beta.2
Released on June 7th, 2024

Significant updates from version 2.0.0 Beta.1 include:
- added channel control: 
- added Widget Tab in the tools in menu bar

## Version 2.0.0 Beta.1
Released on May 15th, 2024

Significant updates from version 2.0.0 Beta include:
- Bug fixes

## Version 2.0.0 Beta
Released on April 21st, 2024.

Significant updates from version 1.0 Alpha include:
- Bug fixes
- Backup Folder feature
- Improved UX
- Documentations are complete

## Version 2.0 Alpha
Released on January 15th, 2024.

[![Version 2.0 alpha release note](https://img.youtube.com/vi/tL8DHhC1H10/0.jpg)](https://www.youtube.com/watch?v=tL8DHhC1H10)

Significant updates from version 1.0 Beta include:
- Retains all features from 1.0 Beta with the exception of:
    - Reflowing serial output text to hide . This functionality is planned for future releases.
    - Serial history related Editor keyboard shortcuts, which are not often used.
        - [Alt-Up] and [Alt-Down]
        - [Alt-Shift-Enter]
- Improvements in:
    - Reliability
    - User Interface interactions
    - Extensibility
    - Maintainability

Please note: Due to the high frequency of bug fixes in the Alpha stage, patch version numbers will not be assigned until the update to Beta.

## Version 1.0 Beta

- IDE: https://urfdvw.github.io/circuitpython-online-ide-1/
- GitHub Repo: https://github.com/urfdvw/circuitpython-online-ide-1

## Version 0.1

- IDE: https://urfdvw.github.io/circuitpython-online-ide-0/
- GitHub Repo: https://github.com/urfdvw/circuitpython-online-ide-0
                `}
                onClose={() => {}}
                open={true}
            />
            <div className="app">
                <div className="app-header">
                    <AppMenu />
                </div>
                <div className="app-body">
                    <FlexLayout.Layout model={flexModel} factory={Factory} />
                </div>
            </div>
        </AppContext.Provider>
    );
}

export default App;
