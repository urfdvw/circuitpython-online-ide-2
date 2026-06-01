import { useContext, useEffect, useState } from "react";
import { Box } from "@mui/material";

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
const LIB_PATH = "/lib/connected_variables.py";

export default function Widgets() {
    const { serialOutput, sendDataToSerialPort, rootDirHandle, rootFolderDirectoryReady } = useContext(AppContext);
    const { setVariableOnMcu, getVariableOnMcu, connectedVariables } = useConnectedVariables(
        serialOutput,
        sendDataToSerialPort
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
            key: w.id,
            connectedVariables: connectedVariables,
            getWidgetProperty: getProp,
            setWidgetProperty: setProp,
        };
        switch (w.widgetType) {
            case "Set":
                return <VariableSet {...common} setVariableOnMcu={setVariableOnMcu} />;
            case "Display":
                return <VariableDisplay {...common} getVariableOnMcu={getVariableOnMcu} />;
            case "Cursor":
                return <VariableCursor {...common} setVariableOnMcu={setVariableOnMcu} />;
            case "Slider":
                return (
                    <VariableSlider
                        {...common}
                        setVariableOnMcu={setVariableOnMcu}
                        getVariableOnMcu={getVariableOnMcu}
                    />
                );
            case "SliderReadOnly":
                return <VariableSliderReadOnly {...common} getVariableOnMcu={getVariableOnMcu} />;
            case "ColorPicker":
                return <VariableColorPicker {...common} setVariableOnMcu={setVariableOnMcu} />;
            case "Button":
                return <VariableButton {...common} setVariableOnMcu={setVariableOnMcu} />;
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
                        {variableWidgets.map((w) => renderWidget(w))}
                    </Box>
                )}
            </TabTemplate>
        </WidgetContext.Provider>
    );
}
