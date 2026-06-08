import { useState, useEffect, useRef, useCallback } from "react";
import { CV_JSON_START, CV_JSON_END, CV_READ_START, CV_READ_END, CV_SESSION_DIVIDER } from "../../constants";
import { aggregateConnectedVariable, matchesInBetween } from "../../hooks/useSerial/textProcessor";

// The board emits CV_SESSION_DIVIDER on (re)connect; parse only the latest session so stale
// data from a previous run can't leak in.
function getLatestSession(dataFromBoard) {
    return (dataFromBoard || "").split(CV_SESSION_DIVIDER).at(-1);
}

// Tally read-ack counts per variable in the given text. Each <CVR> frame is a JSON array of the
// variable names the board just ingested, e.g. <CVR>["a"]</CVR>.
function aggregateReadCounts(text) {
    const counts = {};
    for (const block of matchesInBetween(text, CV_READ_START, CV_READ_END)) {
        let names;
        try {
            names = JSON.parse(block);
        } catch (e) {
            continue; // partial / malformed frame; ignore
        }
        if (!Array.isArray(names)) continue;
        for (const n of names) counts[n] = (counts[n] || 0) + 1;
    }
    return counts;
}

/**
 * Connected-variables state + a read-ack backpressure engine with two per-call send modes:
 *
 *   "latest" (coalesce): while a write is in flight, only the LATEST value is kept; on the ack we
 *       send that latest value. No pile-up — used by the slider / color picker.
 *   "queue" (sequential): every value is queued; on each ack we send the next one in order, so the
 *       board receives the full sequence in order — used by the cursor (keeps all the points).
 *
 * At most one write per variable is in flight; the next is sent only after the board's read-ack.
 */
export default function useConnectedVariables(dataFromBoard, sendToBoard) {
    const [connectedVariables, setConnectedVariables] = useState({});
    const [pending, setPending] = useState({}); // { [name]: bool } — drives the widget indicator

    const queueRef = useRef({}); // { [name]: [values waiting to be sent] }
    const flightRef = useRef({}); // { [name]: { ackAt } } — present means a write is in flight
    const readCountsRef = useRef({}); // { [name]: ack count } in the latest session
    const sessionRef = useRef(0); // number of session dividers seen (to detect (re)connects)

    // always use the latest sender without re-creating the stable callbacks below
    const sendRef = useRef(sendToBoard);
    sendRef.current = sendToBoard;

    // send the next queued value for `name`, if nothing is in flight
    const pump = useCallback((name) => {
        if (flightRef.current[name]) return; // a write is already in flight (waiting for its ack)
        const q = queueRef.current[name];
        if (!q || q.length === 0) return;
        const value = q.shift();
        // trailing "\n" is REQUIRED so the board's streaming matcher emits the frame-end event
        sendRef.current(CV_JSON_START + JSON.stringify({ [name]: value }) + CV_JSON_END + "\n");
        flightRef.current[name] = { ackAt: readCountsRef.current[name] || 0 };
        setPending((p) => ({ ...p, [name]: true }));
    }, []);

    // mode: "latest" (coalesce, keep only the newest) | "queue" (keep every input, send in order)
    const setVariableOnMcu = useCallback(
        (name, value, mode = "latest") => {
            let q = queueRef.current[name];
            if (!q) q = queueRef.current[name] = [];
            if (mode === "queue") {
                q.push(value); // keep every input
            } else {
                q.length = 0; // coalesce: drop anything still waiting, keep only the latest
                q.push(value);
            }
            pump(name);
        },
        [pump]
    );

    useEffect(() => {
        const session = getLatestSession(dataFromBoard);

        // current values from <CV> frames
        try {
            setConnectedVariables(aggregateConnectedVariable(session));
        } catch (e) {
            console.error("connected variables parse error", e);
        }

        // detect a session (re)start: drop queued / in-flight writes from the old session
        const dividerCount = (dataFromBoard || "").split(CV_SESSION_DIVIDER).length - 1;
        if (dividerCount !== sessionRef.current) {
            sessionRef.current = dividerCount;
            flightRef.current = {};
            queueRef.current = {};
            setPending({});
        }

        // read-acks for the latest session
        const counts = aggregateReadCounts(session);
        readCountsRef.current = counts;

        // clear any in-flight write whose ack has now arrived, then pump the next queued value
        const cleared = [];
        for (const name of Object.keys(flightRef.current)) {
            if ((counts[name] || 0) > flightRef.current[name].ackAt) {
                delete flightRef.current[name];
                cleared.push(name);
            }
        }
        if (cleared.length) {
            setPending((p) => {
                const next = { ...p };
                for (const n of cleared) next[n] = false;
                return next;
            });
            for (const n of cleared) pump(n);
        }
    }, [dataFromBoard, pump]);

    const getVariableOnMcu = useCallback((name) => connectedVariables[name], [connectedVariables]);
    const isPending = useCallback((name) => !!pending[name], [pending]);

    return { setVariableOnMcu, getVariableOnMcu, connectedVariables, isPending };
}
