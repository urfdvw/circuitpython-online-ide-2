import useConnectedVariables from "./useConnectedVariables";
import { useContext, useEffect, useState } from "react";
import ideContext from "../../ideContext";
import VariableSet from "./VariableSet";
import useVariableWidgets from "./useVariableWidgets";

export default function Widgets() {
    const { serialOutput, sendDataToSerialPort } = useContext(ideContext);
    const { setVariableOnMcu, getVariableOnMcu, connectedVariables } = useConnectedVariables(
        serialOutput,
        sendDataToSerialPort
    );
    const { variableWidgets, setVariableWidgets, variableName, description, setVariableName, setDescription } =
        useVariableWidgets();

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
                            variableName={variableName(w.id)}
                            setVariableName={(name) => setVariableName(w.id, name)}
                            description={description(w.id)}
                            setDescription={(desc) => setDescription(w.id, desc)}
                        />
                    );
                }
            })}
            <hr />
        </>
    );
}
