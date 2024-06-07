import { useState, useEffect } from "react";
import { CV_JSON_START, CV_JSON_END, LINE_END, SOFT_REBOOT } from "../../constants";
import { matchesInBetween } from "../../serial/textProcessor";

function getLatestSession(dataFromMcu) {
    return dataFromMcu.split(SOFT_REBOOT).at(-1);
}

const aggregateConnectedVariable = (text) => {
    const cvBlocks = matchesInBetween(text, CV_JSON_START, CV_JSON_END);
    var ConnectedVariable = {};
    for (const b of cvBlocks) {
        ConnectedVariable = { ...ConnectedVariable, ...JSON.parse(b) };
    }
    return ConnectedVariable;
};

export default function useConnectedVariables(dataFromMcu, sendDataToMcu) {
    const [connectedVariables, setConnectedVariables] = useState({});

    useEffect(() => {
        setConnectedVariables(aggregateConnectedVariable(getLatestSession(dataFromMcu)));
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
