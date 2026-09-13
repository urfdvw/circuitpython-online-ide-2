import { useContext, useEffect, useState } from "react";
import { Box, Typography, Button } from "@mui/material";

import AppContext from "../../AppContext";
import TabTemplate from "../../utilComponents/TabTemplate";
import { selectTabById } from "../../layout/layoutUtils";
import {
    writeToPath,
    writeToPathStrict,
    getFromPathIfExists,
    getFileText,
    checkFileExists,
} from "../../utilComponents/react-local-file-system";

import useConnectedVariables from "./useConnectedVariables";
import useVariableWidgets from "./useVariableWidgets";
import WidgetContext from "./WidgetsContext";
import WidgetsConfig from "./WidgetsConfig";

import VariableSet from "./VariableSet";
import VariableDisplay from "./VariableDisplay";
import VariableCursor from "./VariableCursor";
import VariableSlider from "./VariableSlider";
import VariableMeter from "./VariableMeter";
import VariableColorPicker from "./VariableColorPicker";
import VariableButton from "./VariableButton";

import { writeConnectedVariablesLib, ensureDataSerialInBoot } from "./installConnectedVariables";

const WIDGETS_PATH = "/ide/widgets.json";
const LIB_FILENAME = "connected_variables.py";

export default function Widgets() {
    const {
        dataSerialOutput,
        sendToDataSerialPort,
        dataSerialReady,
        connectToDataSerialPort,
        openDirectory,
        rootDirHandle,
        rootFolderDirectoryReady,
        flexModel,
        helpTabSelection,
    } = useContext(AppContext);
    // Connected Variables travel on the data channel (usb_cdc.data), not the REPL serial.
    const { setVariableOnMcu, getVariableOnMcu, connectedVariables, isPending } = useConnectedVariables(
        dataSerialOutput,
        sendToDataSerialPort
    );
    const { variableWidgets, setVariableWidgets, getWidgetProperty, setWidgetProperty } = useVariableWidgets();
    const [layoutIsLocked, setLayoutIsLocked] = useState(false);
    const [showConfig, setShowConfig] = useState(false);
    // null = checking, true/false = whether connected_variables.py is on the board
    const [libInstalled, setLibInstalled] = useState(null);

    useEffect(() => {
        let cancelled = false;
        setVariableWidgets([]);
        async function load() {
            if (!rootFolderDirectoryReady || !rootDirHandle) return;
            try {
                const text = await getFromPathIfExists(rootDirHandle, WIDGETS_PATH);
                const widgets = text ? JSON.parse(text) : [];
                if (!cancelled && Array.isArray(widgets)) {
                    setVariableWidgets(widgets.filter((widget) => widget && typeof widget === "object"));
                }
            } catch (error) {
                if (!cancelled) console.warn("Could not load widget layout:", error);
            }
        }
        load();
        return () => { cancelled = true; };
    }, [rootFolderDirectoryReady, rootDirHandle, setVariableWidgets]);

    useEffect(() => {
        let cancelled = false;
        setLibInstalled(null);
        async function check() {
            let installed = false;
            try {
                if (rootFolderDirectoryReady && rootDirHandle && await checkFileExists(rootDirHandle, LIB_FILENAME)) {
                    const handle = await rootDirHandle.getFileHandle(LIB_FILENAME);
                    installed = (await getFileText(handle)).trim().length > 0;
                }
            } catch (error) {
                if (!cancelled) console.warn("Could not check connected variables library:", error);
            }
            if (!cancelled) setLibInstalled(installed);
        }
        check();
        return () => { cancelled = true; };
    }, [rootFolderDirectoryReady, rootDirHandle]);

    function requireDrive() {
        if (!rootDirHandle) {
            alert("Please open the CIRCUITPY drive first.");
            return false;
        }
        return true;
    }

    // write the library to the board and make sure boot.py enables the data channel
    // (shared steps in installConnectedVariables.js, also used by the agent bridge)
    async function installLibrary() {
        if (!requireDrive()) return;
        let updated;
        try {
            await writeConnectedVariablesLib(rootDirHandle, writeToPathStrict);
            setLibInstalled(true);
            ({ updated } = await ensureDataSerialInBoot(rootDirHandle, writeToPathStrict));
        } catch (error) {
            alert("Could not install connected variables. " + error.message);
            return;
        }
        if (updated) {
            alert(
                "connected_variables installed and the data serial channel was enabled in boot.py.\n\n" +
                    "Please HARD-RESET the board (unplug/replug, or press its reset button) for the change " +
                    "to take effect, then open Tools → Data Serial and connect to the new (data) port."
            );
        } else {
            alert("connected_variables installed. The data serial channel is already enabled in boot.py.");
        }
    }

    async function copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
        } catch (err) {
            console.error("failed to copy to clipboard:", err);
        }
    }

    const menuStructure = [
        {
            text: showConfig ? "Back" : "Edit",
            handler: () => setShowConfig((state) => !state),
        },
        {
            label: "copy code",
            options: [
                {
                    text: "import",
                    handler: () =>
                        copyToClipboard("from connected_variables import connected_variables as cv"),
                },
                {
                    text: "define",
                    handler: () => copyToClipboard('cv.define("", 0)  # variable_name, initial value'),
                },
                {
                    text: "heartbeat",
                    handler: () => copyToClipboard("cv.heart_beat()"),
                },
            ],
        },
        {
            text: layoutIsLocked ? "Unlock layout" : "Lock layout",
            handler: () => setLayoutIsLocked((state) => !state),
        },
        {
            label: "≡",
            options: [
                {
                    text: "Install Library",
                    handler: installLibrary,
                },
                {
                    text: "Save Widgets",
                    handler: async () => {
                        if (!requireDrive()) return;
                        await writeToPath(rootDirHandle, WIDGETS_PATH, JSON.stringify(variableWidgets, null, 2));
                    },
                },
                {
                    text: "Load Widgets",
                    handler: async () => {
                        if (!requireDrive()) return;
                        const loadedText = await getFromPathIfExists(rootDirHandle, WIDGETS_PATH);
                        if (!loadedText) {
                            alert("No saved widgets found at " + WIDGETS_PATH);
                            return;
                        }
                        setVariableWidgets(JSON.parse(loadedText));
                    },
                },
                {
                    text: "Help",
                    handler: () => {
                        selectTabById(flexModel, "help_tab");
                        helpTabSelection.setTabName("widgets");
                    },
                },
            ],
        },
    ];

    function renderWidget(w) {
        const getProp = (propertyName) => getWidgetProperty(w.id, propertyName);
        const setProp = (propertyName, newValue) => setWidgetProperty(w.id, propertyName, newValue);
        const common = {
            connectedVariables,
            getWidgetProperty: getProp,
            setWidgetProperty: setProp,
            // read-ack status for this widget's variable (write widgets show the indicator)
            pending: isPending(getProp("variableName")),
        };
        switch (w.widgetType) {
            case "Set":
                return <VariableSet key={w.id} {...common} setVariableOnMcu={setVariableOnMcu} />;
            case "Display":
                return <VariableDisplay key={w.id} {...common} getVariableOnMcu={getVariableOnMcu} />;
            case "Cursor":
                return <VariableCursor key={w.id} {...common} setVariableOnMcu={setVariableOnMcu} />;
            case "Slider":
                return (
                    <VariableSlider
                        key={w.id}
                        {...common}
                        setVariableOnMcu={setVariableOnMcu}
                        getVariableOnMcu={getVariableOnMcu}
                    />
                );
            case "Meter":
                return <VariableMeter key={w.id} {...common} getVariableOnMcu={getVariableOnMcu} />;
            case "ColorPicker":
                return <VariableColorPicker key={w.id} {...common} setVariableOnMcu={setVariableOnMcu} />;
            case "Button":
                return <VariableButton key={w.id} {...common} setVariableOnMcu={setVariableOnMcu} />;
            default:
                return null;
        }
    }

    return (
        <WidgetContext.Provider value={{ layoutIsLocked: layoutIsLocked }}>
            <TabTemplate title="Widgets" menuStructure={menuStructure}>
                {showConfig ? (
                    <Box sx={{ p: 1 }}>
                        <WidgetsConfig variableWidgets={variableWidgets} setVariableWidgets={setVariableWidgets} />
                    </Box>
                ) : !rootFolderDirectoryReady ? (
                    <Box sx={{ p: 2 }}>
                        <Typography component="p" sx={{ mb: 2, color: "text.secondary" }}>
                            The CIRCUITPY drive isn&apos;t open. Open it to detect your board, install the library, and
                            save/load widget layouts.
                        </Typography>
                        <Button variant="contained" onClick={openDirectory}>
                            Open CIRCUITPY Drive
                        </Button>
                    </Box>
                ) : libInstalled === false ? (
                    <Box sx={{ p: 2 }}>
                        <Typography component="p" sx={{ mb: 2, color: "text.secondary" }}>
                            The Connected Variables library isn&apos;t installed on this board yet. Installing it
                            copies <code>connected_variables.py</code> to the CIRCUITPY drive and enables the data
                            serial channel in <code>boot.py</code> (you&apos;ll be asked to reset the board). Open the
                            CIRCUITPY drive first if you haven&apos;t.
                        </Typography>
                        <Button variant="contained" onClick={installLibrary}>
                            Install Library
                        </Button>
                    </Box>
                ) : !dataSerialReady ? (
                    <Box sx={{ p: 2 }}>
                        <Typography component="p" sx={{ mb: 2, color: "text.secondary" }}>
                            Data Serial is not connected. Connect to the board&apos;s data port for the widgets to sync.
                        </Typography>
                        <Button variant="contained" onClick={() => connectToDataSerialPort()}>
                            Connect Data Serial
                        </Button>
                    </Box>
                ) : (
                    <Box sx={{ position: "relative", width: "100%", height: "100%" }}>
                        {variableWidgets.map((w) => renderWidget(w))}
                    </Box>
                )}
            </TabTemplate>
        </WidgetContext.Provider>
    );
}
