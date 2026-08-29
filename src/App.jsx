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
import useFileSource from "./hooks/useFileSource";
import useEditorTabs from "./hooks/useEditorTabs";
import useUnsavedGuards from "./hooks/useUnsavedGuards";
// serial
import { useSerial, useDataSerial, useSerialCommands } from "./hooks/useSerial";
// Board info
import useBoardInfo from "./hooks/useBoardInfo";
// Backup folder (remembered per board)
import useBackupDirectory from "./hooks/useBackupDirectory";
// Auto-open the Plot tab on a plot/animation command
import usePlotAutoOpen from "./hooks/usePlotAutoOpen";
// version info
import WhatSNew from "./components/WhatSNew";
// agent bridge (window.__cpyAgent)
import AgentBridge from "./components/agentBridge/AgentBridge";

// Routing shell: hash routes and unsupported-browser handling. It must stay
// hook-free so the IDE's hooks (in <Ide/>) never run after a conditional return.
function App() {
    if (window.location.hash.startsWith("#/camera")) {
        return <CameraPage />;
    }

    if (window.location.hash.startsWith("#/docs")) {
        return <DocsSite />;
    }

    if (window.location.hash.startsWith("#/product")) {
        return <ProductPage />;
    }

    if (isMobile || isSafari || isFirefox) {
        return <ProductPage />;
    }

    return <Ide />;
}

// The IDE itself: wires together hooks, context, and layout (assembly only).
function Ide() {
    useEffect(() => {
        document.body.style.overflow = "hidden";
    }, []);

    // testing state (consumed by the Placeholder tab)
    const [testCount, setTestCount] = useState(0);
    // layout
    const [flexModel] = useState(FlexLayout.Model.fromJson(layout));
    // config
    const configTabSelection = useTabValueName(schemas);
    const appConfig = useConfig(schemas);
    // help
    const helpTabSelection = useTabValueName(helpDocs);
    // hot keys
    useLayoutHotKeys(flexModel);
    // release channel (?channel=dev|beta), logged once for diagnostics
    const { showDevFeatures, showBetaFeatures } = useChannel();
    useEffect(() => {
        console.log("[showDevFeatures, showBetaFeatures]", [showDevFeatures, showBetaFeatures]);
    }, [showDevFeatures, showBetaFeatures]);
    const { onFileClick, fileLookUp } = useEditorTabs(flexModel);
    // serial
    const { connectToSerialPort, sendDataToSerialPort, addToSerialOutput, serialOutput, serialReady, serial } =
        useSerial();
    const { sendCtrlC, sendCtrlD, sendCode, codeHistory } = useSerialCommands(
        sendDataToSerialPort,
        serialOutput,
        serialReady
    );
    // file system
    // Which source backs rootDirHandle: the mounted CIRCUITPY drive, or the board
    // over serial. Both are real file sources; the setting just picks one.
    const {
        openDirectory,
        directoryReady: rootFolderDirectoryReady,
        statusText: rootFolderStatusText,
        rootDirHandle,
        fileSource,
        autoWatchFiles,
        refresh: refreshFileSource,
    } = useFileSource(serial, serialReady, appConfig.config?.general?.file_source);
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
    // Backup "computer folder", remembered per board (keyed by the board UID).
    const {
        openBackupDirectory,
        backupFolderDirectoryReady,
        backupFolderStatusText,
        backupDirHandle,
        backupRestoreWarning,
        backupReconnectName,
        reconnectBackupDirectory,
    } = useBackupDirectory(boardInfo);
    // Debugger
    const [instrumentationOutdated, setInstrumentationOutdated] = useState(true);

    // unsaved-changes guards (tab close + page close) and the shared dirty-file registry
    const { setFileDirty, clearFileDirty, handleLayoutAction } = useUnsavedGuards(flexModel);

    // auto-open the Plot tab when the board emits a plot/animation command
    usePlotAutoOpen(serialOutput, flexModel);

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
                fileSource,
                autoWatchFiles,
                refreshFileSource,
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
                backupRestoreWarning,
                backupReconnectName,
                reconnectBackupDirectory,
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
