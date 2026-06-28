import { useState, useEffect, useRef, useCallback } from "react";
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
import { getFromPath } from "./utilComponents/react-local-file-system/utilities/fileSystemUtils";
import useEditorTabs from "./hooks/useEditorTabs";
// serial
import { useSerial, useDataSerial, useSerialCommands } from "./hooks/useSerial";
// Board info
import { parseCircuitPythonInfo } from "./utilFunctions/dataProcessing";
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

    // Shared dirty-file registry: each open editor reports its unsaved status here, keyed by
    // its tab's fileKey. Kept in a ref so the tab-close guard and beforeunload handler always
    // read the current value without re-renders or stale closures.
    const dirtyFilesRef = useRef({});
    const setFileDirty = useCallback((fileKey, dirty) => {
        dirtyFilesRef.current[fileKey] = dirty;
    }, []);
    const clearFileDirty = useCallback((fileKey) => {
        delete dirtyFilesRef.current[fileKey];
    }, []);
    const isFileDirty = useCallback((fileKey) => Boolean(dirtyFilesRef.current[fileKey]), []);
    const anyDirty = useCallback(() => Object.values(dirtyFilesRef.current).some(Boolean), []);

    // Warn before leaving the page while any open editor has unsaved changes.
    useEffect(() => {
        const handler = (e) => {
            if (anyDirty()) {
                e.preventDefault();
                e.returnValue = "";
            }
        };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [anyDirty]);

    // Intercept editor tab closes: if the file has unsaved edits, confirm before deleting it.
    // onAction is synchronous, so a synchronous window.confirm is required; returning undefined
    // vetoes the close, returning the action lets it proceed.
    const handleLayoutAction = useCallback(
        (action) => {
            if (action.type === FlexLayout.Actions.DELETE_TAB) {
                const node = flexModel.getNodeById(action.data.node);
                const fileKey = node && node.getConfig ? node.getConfig()?.fileKey : null;
                if (fileKey && isFileDirty(fileKey)) {
                    const name = node.getName ? node.getName() : "this file";
                    const ok = window.confirm(`"${name}" has unsaved changes.\nClose without saving?`);
                    if (!ok) {
                        return undefined;
                    }
                    clearFileDirty(fileKey);
                }
            }
            return action;
        },
        [flexModel, isFileDirty, clearFileDirty]
    );

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
