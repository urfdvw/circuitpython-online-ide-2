import { useState, useEffect } from "react";
import { CV_JSON_START, CV_JSON_END, LINE_END, SOFT_REBOOT } from "../../constants";
import { aggregateConnectedVariable } from "../../hooks/useSerial/textProcessor";

function getLatestSession(dataFromMcu) {
    return (dataFromMcu || "").split(SOFT_REBOOT).at(-1);
}

export default function useConnectedVariables(dataFromMcu, sendDataToMcu) {
    const [connectedVariables, setConnectedVariables] = useState({});

    useEffect(() => {
        try {
            setConnectedVariables(aggregateConnectedVariable(getLatestSession(dataFromMcu)));
        } catch (e) {
            // a partial / malformed CV frame can arrive mid-stream; ignore until complete
            console.error("connected variables parse error", e);
        }
    }, [dataFromMcu]);

    function getVariableOnMcu(variableName) {
        return connectedVariables[variableName];
    }

    function setVariableOnMcu(variableName, variableValue) {
        const updatedVariable = { [variableName]: variableValue };
        sendDataToMcu(CV_JSON_START + JSON.stringify(updatedVariable) + CV_JSON_END + LINE_END);
    }

    return { setVariableOnMcu, getVariableOnMcu, connectedVariables };
}
