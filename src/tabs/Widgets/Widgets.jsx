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

    const [description, setDescription] = useState("test description");
    const [variableName, setVariableName] = useState("a name that does not exist");

    return (
        <>
            <VariableSet connectedVariables={connectedVariables} setVariable={setVariable} />
            <hr />
            <VariableBase
                connectedVariables={connectedVariables}
                widgetTitle="test base"
                variableName={variableName}
                setVariableName={setVariableName}
                hasDescription={true}
                description={description}
                setDescription={setDescription}
            />
        </>
    );
}
