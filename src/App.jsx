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
import { isMobile } from "react-device-detect";
import MobileSupportInfo from "./supportInfo/MobileSupportInfo";
// file system
import { useFileSystem } from "./utilComponents/react-local-file-system";
import useEditorTabs from "./hooks/useEditorTabs";
// serial
import { useSerial, useSerialCommands } from "./hooks/useSerial";

function App() {
    // testing state
    const [testCount, setTestCount] = useState(0);
    // layout
    const [flexModel, setFlexModel] = useState(FlexLayout.Model.fromJson(layout));
    // config
    const configTabSelection = useTabValueName(schemas);
    const appConfig = useConfig(schemas);
    useEffect(() => {
        console.log("config", appConfig);
    }, [appConfig]);
    // help
    const helpTabSelection = useTabValueName(docs);
    useEffect(() => {
        console.log("helpTabSelection", helpTabSelection);
    }, [helpTabSelection]);
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
    const {
        connectToSerialPort,
        sendDataToSerialPort,
        clearSerialOutput,
        serialOutput,
        fullSerialHistory,
        serialReady,
    } = useSerial();
    const { sendCtrlC, sendCtrlD, sendCode, codeHistory } = useSerialCommands(
        sendDataToSerialPort,
        serialOutput,
        serialReady
    );

    /**** main logic ****/
    if (isMobile) {
        return <MobileSupportInfo />;
    }

    if (!appConfig.ready) {
        return;
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
                clearSerialOutput,
                serialOutput,
                fullSerialHistory,
                serialReady,
                sendCtrlC,
                sendCtrlD,
                sendCode,
                codeHistory,
            }}
        >
            <DarkTheme dark={dark} highContrast={highContrast} />
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
