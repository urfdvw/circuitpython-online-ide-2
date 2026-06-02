import { useContext, useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";

import AppContext from "../../AppContext";
import TabTemplate from "../../utilComponents/TabTemplate";
import { writeToPath, getFromPath } from "../../utilComponents/react-local-file-system";

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
const LIB_PATH = "/connected_variables.py";
const BOOT_PATH = "/boot.py";

export default function Widgets() {
    const {
        dataSerialOutput,
        sendToDataSerialPort,
        dataSerialReady,
        rootDirHandle,
        rootFolderDirectoryReady,
    } = useContext(AppContext);
    // Connected Variables travel on the data channel (usb_cdc.data), not the REPL serial.
    const { setVariableOnMcu, getVariableOnMcu, connectedVariables } = useConnectedVariables(
        dataSerialOutput,
        sendToDataSerialPort
    );
    const { variableWidgets, setVariableWidgets, getWidgetProperty, setWidgetProperty } = useVariableWidgets();
    const [layoutIsLocked, setLayoutIsLocked] = useState(false);
    const [showConfig, setShowConfig] = useState(false);

    // auto-load the saved layout on mount, so opening ide/widgets.json shows the widgets
    useEffect(() => {
        async function load() {
            if (!rootFolderDirectoryReady || !rootDirHandle) {
                return;
            }
            try {
                const loadedText = await getFromPath(rootDirHandle, WIDGETS_PATH);
                if (loadedText) {
                    setVariableWidgets(JSON.parse(loadedText));
                }
            } catch (e) {
                // no saved widgets yet; start with an empty canvas
            }
        }
        load();
    }, [rootFolderDirectoryReady]);

    function requireDrive() {
        if (!rootDirHandle) {
            alert("Please open the CIRCUITPY drive first.");
            return false;
        }
        return true;
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
                    handler: async () => {
                        if (!requireDrive()) return;
                        await writeToPath(rootDirHandle, LIB_PATH, connected_variables);
                        await ensureDataSerialInBootPy();
                    },
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
                        const loadedText = await getFromPath(rootDirHandle, WIDGETS_PATH);
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
            connectedVariables: connectedVariables,
            getWidgetProperty: getProp,
            setWidgetProperty: setProp,
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
                ) : (
                    <Box sx={{ position: "relative", width: "100%", height: "100%" }}>
                        {!dataSerialReady && (
                            <Typography sx={{ p: 1, color: "text.secondary" }} component="p">
                                Data Serial not connected — open <b>Tools → Data Serial</b> and connect to the
                                board's data port for widgets to sync.
                            </Typography>
                        )}
                        {variableWidgets.map((w) => renderWidget(w))}
                    </Box>
                )}
            </TabTemplate>
        </WidgetContext.Provider>
    );
}
