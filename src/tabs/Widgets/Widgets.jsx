import useConnectedVariables from "./useConnectedVariables";
import { useContext, useEffect } from "react";
import ideContext from "../../ideContext";
import VariableSet from "./VariableSet";

export default function Widgets() {
    const { serialOutput, sendDataToSerialPort } = useContext(ideContext);
    const { setVariable, getVariable, connectedVariables } = useConnectedVariables(serialOutput, sendDataToSerialPort);
    useEffect(() => {
        console.log(connectedVariables);
    }, [connectedVariables]);
    return (
        <>
            Widgets Tab
            <VariableSet connectedVariables={connectedVariables} setVariable={setVariable} />
        </>
    );
}
