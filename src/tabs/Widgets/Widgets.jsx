import useConnectedVariables from "./useConnectedVariables";
import { useContext, useEffect } from "react";
import ideContext from "../../ideContext";
import useVariableWidgets from "./useVariableWidgets";
import VariableSet from "./VariableSet";
import VariableDisplay from "./VariableDisplay";
import VariableCursor from "./VariableCursor";
import { Typography, Toolbar, Tooltip, Button } from "@mui/material";
import { Menu } from "../../layout/Menu";
export default function Widgets() {
    const { serialOutput, sendDataToSerialPort } = useContext(ideContext);
    const { setVariableOnMcu, getVariableOnMcu, connectedVariables } = useConnectedVariables(
        serialOutput,
        sendDataToSerialPort
    );
    const { variableWidgets, setVariableWidgets, getWidgetProperty, setWidgetProperty } = useVariableWidgets();

    // debug
    useEffect(() => {
        console.log(connectedVariables);
    }, [connectedVariables]);
    useEffect(() => {
        console.log(variableWidgets);
    }, [variableWidgets]);

    const hiddenMenuLabelOptions = [
        {
            text: "Pop Up",
            handler: () => {},
        },
    ];

    return (
        <div>
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
                        Title
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
                        <Tooltip title="Save and Run" followCursor={true}>
                            <Button onClick={() => {}}>Save</Button>
                        </Tooltip>
                        <Menu label="⋮" options={hiddenMenuLabelOptions} />
                    </Toolbar>
                </div>
            </div>
            <div style={{ height: "500pt", overflow: "auto" }}>
                {variableWidgets.map((w) => {
                    if (w.widgetType === "VariableSet") {
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
                    } else if (w.widgetType === "VariableDisplay") {
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
                    } else if (w.widgetType === "VariableCursor") {
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
                    }
                })}
            </div>
        </div>
    );
}
