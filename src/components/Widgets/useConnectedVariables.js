import { useState, useEffect } from "react";
import { CV_JSON_START, CV_JSON_END, CV_SESSION_DIVIDER } from "../../constants";
import { aggregateConnectedVariable } from "../../hooks/useSerial/textProcessor";

// The board emits CV_SESSION_DIVIDER on (re)connect; parse only the latest session so stale
// data from a previous run can't leak in.
function getLatestSession(dataFromBoard) {
    return (dataFromBoard || "").split(CV_SESSION_DIVIDER).at(-1);
}

export default function useConnectedVariables(dataFromBoard, sendToBoard) {
    const [connectedVariables, setConnectedVariables] = useState({});

    useEffect(() => {
        try {
            setConnectedVariables(aggregateConnectedVariable(getLatestSession(dataFromBoard)));
        } catch (e) {
            // a partial / malformed CV frame can arrive mid-stream; ignore until complete
            console.error("connected variables parse error", e);
        }
    }, [dataFromBoard]);

    function getVariableOnMcu(variableName) {
        return connectedVariables[variableName];
    }

    function setVariableOnMcu(variableName, variableValue) {
        const updatedVariable = { [variableName]: variableValue };
        // The trailing "\n" is REQUIRED: the board's streaming matcher only emits the frame-end
        // (exit) event once it sees a character AFTER the closing </CV>. Without it the board
        // accumulates the frame but never parses/applies it.
        sendToBoard(CV_JSON_START + JSON.stringify(updatedVariable) + CV_JSON_END + "\n");
    }

    return { setVariableOnMcu, getVariableOnMcu, connectedVariables };
}
