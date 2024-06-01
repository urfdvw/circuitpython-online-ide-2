import useConnectedVariables from "./useConnectedVariables";
import { useContext, useEffect, useState } from "react";
import ideContext from "../../ideContext";
import useVariableWidgets from "./useVariableWidgets";
import VariableSet from "./VariableSet";
import VariableDisplay from "./VariableDisplay";
import VariableCursor from "./VariableCursor";
import VariableSlider from "./VariableSlider";
import VariableSliderReadOnly from "./VariableSliderReadOnly";
import { Typography, Toolbar, Tooltip, Button } from "@mui/material";
import { Menu } from "../../layout/Menu";
import { writeToPath, getFromPath } from "../../react-local-file-system";
import connected_variables from "./CIRCUITPY/connected_variables.py";
import matcher from "./CIRCUITPY/matcher.py";
import WidgetContext from "./WidgetsContext";
import WidgetsConfig from "./WidgetsConfig";

import LockOpenOutlinedIcon from "@mui/icons-material/LockOpenOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { IconButton } from "@mui/material";

export default function Widgets() {
    const { rootDirHandle } = useContext(ideContext);
    const { serialOutput, sendDataToSerialPort } = useContext(ideContext);
    const { setVariableOnMcu, getVariableOnMcu, connectedVariables } = useConnectedVariables(
        serialOutput,
        sendDataToSerialPort
    );
    const { variableWidgets, setVariableWidgets, getWidgetProperty, setWidgetProperty } = useVariableWidgets();
    const [layoutIsLocked, setLayoutIsLocked] = useState(false);
    const [showConfig, setShowConfig] = useState(false);

    function toggleLayout() {
        console.log("toggleLayout");
        setLayoutIsLocked((state) => {
            console.log(state);
            return !state;
        });
    }

    function toggleEdit() {
        console.log("toggleLayout");
        setShowConfig((state) => {
            console.log(state);
            return !state;
        });
    }

    // // debug
    // useEffect(() => {
    //     console.log(connectedVariables);
    // }, [connectedVariables]);
    // useEffect(() => {
    //     console.log(variableWidgets);
    // }, [variableWidgets]);

    const hiddenMenuLabelOptions = [
        {
            text: "Help",
            handler: () => {},
        },
        {
            text: "Install Library",
            handler: async () => {
                await writeToPath(rootDirHandle, "/lib/connected_variables.py", connected_variables);
                await writeToPath(rootDirHandle, "/lib/matcher.py", matcher);
            },
        },
        {
            text: "Save Widgets",
            handler: async () => {
                await writeToPath(rootDirHandle, "/ide/widgets.json", JSON.stringify(variableWidgets, null, 2));
            },
        },
        {
            text: "Load Widgets",
            handler: async () => {
                const loadedText = await getFromPath(rootDirHandle, "/ide/widgets.json");
                setVariableWidgets(JSON.parse(loadedText));
            },
        },
    ];

    return (
        <WidgetContext.Provider value={{ layoutIsLocked: layoutIsLocked }}>
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    borderBottom: "2px solid rgb(239,239,239)",
                    width: "100%",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "left",
                        flex: 1,
                    }}
                >
                    <Typography component="p" sx={{ marginLeft: "10pt" }}>
                        {/* Title */}
                    </Typography>
                </div>
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "left",
                    }}
                >
                    <Toolbar variant="dense" disableGutters={true} sx={{ minHeight: "35px", maxHeight: "35px" }}>
                        <Button onClick={toggleEdit}>Edit Widgets</Button>
                        <IconButton onClick={toggleLayout}>
                            <Tooltip title={layoutIsLocked ? "layout is locked" : "layout is editable"}>
                                {layoutIsLocked ? <LockOutlinedIcon /> : <LockOpenOutlinedIcon />}
                            </Tooltip>
                        </IconButton>

                        <Menu label="⋮" options={hiddenMenuLabelOptions} />
                    </Toolbar>
                </div>
            </div>
            {showConfig ? (
                <WidgetsConfig variableWidgets={variableWidgets} setVariableWidgets={setVariableWidgets} />
            ) : (
                <div>
                    {variableWidgets.map((w) => {
                        if (w.widgetType === "Set") {
                            return (
                                <VariableSet
                                    connectedVariables={connectedVariables}
                                    setVariableOnMcu={setVariableOnMcu}
                                    key={w.id}
                                    getWidgetProperty={(propertyName) => getWidgetProperty(w.id, propertyName)}
                                    setWidgetProperty={(propertyName, newValue) =>
                                        setWidgetProperty(w.id, propertyName, newValue)
                                    }
                                />
                            );
                        } else if (w.widgetType === "Display") {
                            return (
                                <VariableDisplay
                                    connectedVariables={connectedVariables}
                                    getVariableOnMcu={getVariableOnMcu}
                                    key={w.id}
                                    getWidgetProperty={(propertyName) => getWidgetProperty(w.id, propertyName)}
                                    setWidgetProperty={(propertyName, newValue) =>
                                        setWidgetProperty(w.id, propertyName, newValue)
                                    }
                                />
                            );
                        } else if (w.widgetType === "Cursor") {
                            return (
                                <VariableCursor
                                    connectedVariables={connectedVariables}
                                    setVariableOnMcu={setVariableOnMcu}
                                    key={w.id}
                                    getWidgetProperty={(propertyName) => getWidgetProperty(w.id, propertyName)}
                                    setWidgetProperty={(propertyName, newValue) =>
                                        setWidgetProperty(w.id, propertyName, newValue)
                                    }
                                />
                            );
                        } else if (w.widgetType === "Slider") {
                            return (
                                <VariableSlider
                                    connectedVariables={connectedVariables}
                                    setVariableOnMcu={setVariableOnMcu}
                                    getVariableOnMcu={getVariableOnMcu}
                                    key={w.id}
                                    getWidgetProperty={(propertyName) => getWidgetProperty(w.id, propertyName)}
                                    setWidgetProperty={(propertyName, newValue) =>
                                        setWidgetProperty(w.id, propertyName, newValue)
                                    }
                                />
                            );
                        } else if (w.widgetType === "SliderReadOnly") {
                            return (
                                <VariableSliderReadOnly
                                    connectedVariables={connectedVariables}
                                    getVariableOnMcu={getVariableOnMcu}
                                    key={w.id}
                                    getWidgetProperty={(propertyName) => getWidgetProperty(w.id, propertyName)}
                                    setWidgetProperty={(propertyName, newValue) =>
                                        setWidgetProperty(w.id, propertyName, newValue)
                                    }
                                />
                            );
                        }
                    })}
                </div>
            )}
        </WidgetContext.Provider>
    );
}
