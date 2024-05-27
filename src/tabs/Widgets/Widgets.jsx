import useConnectedVariables from "./useConnectedVariables";
import { useContext, useEffect, useState } from "react";
import ideContext from "../../ideContext";
import VariableSet from "./VariableSet";
import VariableBase from "./VariableBase";

export default function Widgets() {
    const { serialOutput, sendDataToSerialPort } = useContext(ideContext);
    const { setVariable, getVariable, connectedVariables } = useConnectedVariables(serialOutput, sendDataToSerialPort);
    useEffect(() => {
        console.log(connectedVariables);
    }, [connectedVariables]);

    return (
        <>
            <VariableSet connectedVariables={connectedVariables} setVariable={setVariable} />
            <hr />
        </>
    );
}
