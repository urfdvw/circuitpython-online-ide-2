import { useContext, useEffect, useState } from "react";
import { Box, Typography, Button } from "@mui/material";

import AppContext from "../../AppContext";
import TabTemplate from "../../utilComponents/TabTemplate";
import {
    writeToPath,
    getFromPath,
    path2Handles,
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
import VariableSliderReadOnly from "./VariableSliderReadOnly";
import VariableColorPicker from "./VariableColorPicker";
import VariableButton from "./VariableButton";

import connected_variables from "./CIRCUITPY/connected_variables.py";

const WIDGETS_PATH = "/ide/widgets.json";
const LIB_FILENAME = "connected_variables.py";
const LIB_PATH = "/" + LIB_FILENAME;
const BOOT_PATH = "/boot.py";

export default function Widgets() {
    const {
        dataSerialOutput,
        sendToDataSerialPort,
        dataSerialReady,
        connectToDataSerialPort,
        openDirectory,
        rootDirHandle,
        rootFolderDirectoryReady,
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

    // auto-load the saved layout on mount, so opening ide/widgets.json shows the widgets
    useEffect(() => {
        async function load() {
            if (!rootFolderDirectoryReady || !rootDirHandle) {
                return;
            }
            try {
                const loadedText = await readFileIfExists(WIDGETS_PATH);
                if (loadedText) {
                    setVariableWidgets(JSON.parse(loadedText));
                }
            } catch (e) {
                // no saved widgets yet, or malformed JSON; start with an empty canvas
            }
        }
        load();
    }, [rootFolderDirectoryReady]);

    // check whether the connected_variables library is installed on the board: present (checkFileExists
    // does not create it) AND non-empty
    useEffect(() => {
        async function check() {
            if (!rootFolderDirectoryReady || !rootDirHandle) {
                setLibInstalled(false);
                return;
            }
            if (!(await checkFileExists(rootDirHandle, LIB_FILENAME))) {
                setLibInstalled(false);
                return;
            }
            const fileHandle = await rootDirHandle.getFileHandle(LIB_FILENAME);
            const text = await getFileText(fileHandle);
            setLibInstalled(text.trim().length > 0);
        }
        check();
    }, [rootFolderDirectoryReady, rootDirHandle]);

    function requireDrive() {
        if (!rootDirHandle) {
            alert("Please open the CIRCUITPY drive first.");
            return false;
        }
        return true;
    }

    // Read a file's text WITHOUT creating it (getFromPath/path2Handles default to create:true,
    // which would otherwise create an empty file just by checking for it). Returns null if missing.
    async function readFileIfExists(path) {
        try {
            const { fileHandle } = await path2Handles(rootDirHandle, path, { create: false });
            return await getFileText(fileHandle);
        } catch (e) {
            return null;
        }
    }

    // Make sure boot.py enables the secondary USB CDC data channel (usb_cdc.data) that
    // Connected Variables uses. Appends the enable snippet if missing, then asks for a hard reset.
    async function ensureDataSerialInBootPy() {
        let boot = "";
        try {
            boot = await getFromPath(rootDirHandle, BOOT_PATH);
        } catch (e) {
            boot = ""; // boot.py doesn't exist yet
        }
        const dataEnabled = /usb_cdc\.enable\([^)]*\bdata\s*=\s*True/.test(boot);
        if (dataEnabled) {
            alert("connected_variables installed. The data serial channel is already enabled in boot.py.");
            return;
        }
        const base = boot.replace(/\s*$/, "");
        const newBoot = (base ? base + "\n\n" : "") + "import usb_cdc\nusb_cdc.enable(console=True, data=True)\n";
        await writeToPath(rootDirHandle, BOOT_PATH, newBoot);
        alert(
            "connected_variables installed and the data serial channel was enabled in boot.py.\n\n" +
                "Please HARD-RESET the board (unplug/replug, or press its reset button) for the change " +
                "to take effect, then open Tools → Data Serial and connect to the new (data) port."
        );
    }

    // write the library to the board and make sure boot.py enables the data channel
    async function installLibrary() {
        if (!requireDrive()) return;
        await writeToPath(rootDirHandle, LIB_PATH, connected_variables);
        setLibInstalled(true);
        await ensureDataSerialInBootPy();
    }

    const menuStructure = [
        {
            text: showConfig ? "Back" : "Edit",
            handler: () => setShowConfig((state) => !state),
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
                        const loadedText = await readFileIfExists(WIDGETS_PATH);
                        if (!loadedText) {
                            alert("No saved widgets found at " + WIDGETS_PATH);
                            return;
                        }
                        setVariableWidgets(JSON.parse(loadedText));
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
            case "SliderReadOnly":
                return <VariableSliderReadOnly key={w.id} {...common} getVariableOnMcu={getVariableOnMcu} />;
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
                            The CIRCUITPY drive isn't open. Open it to detect your board, install the library, and
                            save/load widget layouts.
                        </Typography>
                        <Button variant="contained" onClick={openDirectory}>
                            Open CIRCUITPY Drive
                        </Button>
                    </Box>
                ) : libInstalled === false ? (
                    <Box sx={{ p: 2 }}>
                        <Typography component="p" sx={{ mb: 2, color: "text.secondary" }}>
                            The Connected Variables library isn't installed on this board yet. Installing it
                            copies <code>connected_variables.py</code> to the CIRCUITPY drive and enables the data
                            serial channel in <code>boot.py</code> (you'll be asked to reset the board). Open the
                            CIRCUITPY drive first if you haven't.
                        </Typography>
                        <Button variant="contained" onClick={installLibrary}>
                            Install Library
                        </Button>
                    </Box>
                ) : !dataSerialReady ? (
                    <Box sx={{ p: 2 }}>
                        <Typography component="p" sx={{ mb: 2, color: "text.secondary" }}>
                            Data Serial is not connected. Connect to the board's data port for the widgets to sync.
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
