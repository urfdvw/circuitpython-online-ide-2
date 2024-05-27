import useConnectedVariables from "./useConnectedVariables";
import { useContext, useEffect } from "react";
import ideContext from "../../ideContext";
import useVariableWidgets from "./useVariableWidgets";
import VariableSet from "./VariableSet";
import VariableDisplay from "./VariableDisplay";
import VariableCursor from "./VariableCursor";

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

    return (
        <>
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
        </>
    );
}
