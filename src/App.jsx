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
import { helpDocs } from "./docs";
// hot keys
import useLayoutHotKeys from "./hotKeys/useLayoutHotKeys";
// theme
import DarkTheme from "react-lazy-dark-theme";
// channel
import useChannel from "./utilHooks/useChannel";
// device support
import { isMobile, isSafari, isFirefox } from "react-device-detect";
import ProductPage from "./components/ProductPage";
import CameraPage from "./components/CameraPage";
import DocsSite from "./components/DocsSite";
// file system
import { useFileSystem } from "./utilComponents/react-local-file-system";
import useEditorTabs from "./hooks/useEditorTabs";
import useUnsavedGuards from "./hooks/useUnsavedGuards";
// serial
import { useSerial, useDataSerial, useSerialCommands } from "./hooks/useSerial";
// Board info
import useBoardInfo from "./hooks/useBoardInfo";
// version info
import WhatSNew from "./components/WhatSNew";
// agent bridge (window.__cpyAgent)
import AgentBridge from "./components/agentBridge/AgentBridge";

function App() {
    if (window.location.hash.startsWith("#/camera")) {
        return <CameraPage />;
    }

    if (window.location.hash.startsWith("#/docs")) {
        return <DocsSite />;
    }

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
    const helpTabSelection = useTabValueName(helpDocs);
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
    // data serial (Connected Variables channel, usb_cdc.data)
    const {
        connectToDataSerialPort,
        disconnectFromDataSerialPort,
        sendToDataSerialPort,
        clearDataSerialOutput,
        dataSerialOutput,
        dataSerialReady,
        dataSerial,
    } = useDataSerial();
    // Board info (derived from the connected drive's boot_out.txt)
    const boardInfo = useBoardInfo(rootFolderDirectoryReady, rootDirHandle);
    // Debugger
    const [instrumentationOutdated, setInstrumentationOutdated] = useState(true);

    // unsaved-changes guards (tab close + page close) and the shared dirty-file registry
    const { setFileDirty, clearFileDirty, handleLayoutAction } = useUnsavedGuards(flexModel);

    /**** main logic ****/
    if (!appConfig.ready) {
        return;
    }

    if (appConfig.config.general.show_board_id && boardInfo && boardInfo.board_id) {
        document.title = "CPy: " + boardInfo.board_id.split("_").join(" ");
    }

    // Baud rate for the Data Serial port (configurable in Serial Console settings).
    // The REPL Serial Console stays fixed at 115200; only this channel is adjustable.
    const dataSerialBaudRate = appConfig.config.serial_console.data_serial_baud_rate;

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
                // shared dirty-file registry (per editor, keyed by fileKey)
                setFileDirty,
                clearFileDirty,
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
                // data serial (Connected Variables channel)
                connectToDataSerialPort: () => connectToDataSerialPort({ baudRate: dataSerialBaudRate }),
                disconnectFromDataSerialPort,
                sendToDataSerialPort,
                clearDataSerialOutput,
                dataSerialOutput,
                dataSerialReady,
                dataSerial,
                // board info
                boardInfo,
                // debugger
                instrumentationOutdated,
                setInstrumentationOutdated,
            }}
        >
            <DarkTheme dark={dark} highContrast={highContrast} />
            <WhatSNew />
            <AgentBridge />
            <div className="app">
                <div className="app-header">
                    <AppMenu />
                </div>
                <div className="app-body">
                    <FlexLayout.Layout model={flexModel} factory={Factory} onAction={handleLayoutAction} />
                </div>
            </div>
        </AppContext.Provider>
    );
}

export default App;
