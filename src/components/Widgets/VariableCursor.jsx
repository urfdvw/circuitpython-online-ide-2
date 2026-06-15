import { useState, useRef } from "react";
import Button from "@mui/material/Button";

import VariableBase from "./VariableBase";

function round(num) {
    return Math.round(num * 10) / 10;
}

const VariableCursor = ({ connectedVariables, setVariableOnMcu, getWidgetProperty, setWidgetProperty, pending }) => {
    const variableName = getWidgetProperty("variableName");

    const xMin = getWidgetProperty("xMin");
    const xMax = getWidgetProperty("xMax");
    const yMin = getWidgetProperty("yMin");
    const yMax = getWidgetProperty("yMax");

    // cursor defaults to "queue" (keep ALL points so the board can draw the full path in order)
    const sendMode = getWidgetProperty("sendMode") || "queue";
    // resolution: skip a new point when its Euclidean distance from the last recorded point
    // (in mapped value units) is below this. Set 0 to record every move.
    const resolution = getWidgetProperty("resolution") ?? 0.1;

    const canvasRange = { x: 300, y: (300 / (xMax - xMin)) * (yMax - yMin) };

    const svgRef = useRef(null);
    const posRef = useRef({ x: 0, y: 0 });
    const lastSentRef = useRef(null); // last RECORDED mapped value { x, y, down }
    const [lines, setLines] = useState([]); // each line is a flat [x0, y0, x1, y1, ...]
    const [cursorDown, setCursorDown] = useState(false);

    function getPos(e) {
        const rect = svgRef.current.getBoundingClientRect();
        const point = e.touches && e.touches.length ? e.touches[0] : e;
        const p = { x: point.clientX - rect.left, y: point.clientY - rect.top };
        posRef.current = p;
        return p;
    }

    // map canvas coords -> board value [x, y, pressed] and send (paced by the hook per `sendMode`)
    function send(p, down) {
        const x = round((p.x / canvasRange.x) * (xMax - xMin) + xMin);
        const y = round(((canvasRange.y - p.y) / canvasRange.y) * (yMax - yMin) + yMin);
        const last = lastSentRef.current;
        // resolution filter: skip near-identical positions, but always record a press/release change
        if (last && last.down === down && Math.hypot(x - last.x, y - last.y) < resolution) {
            return;
        }
        lastSentRef.current = { x, y, down };
        setVariableOnMcu(variableName, [x, y, down ? 1 : 0], sendMode);
    }

    function handleDown(e) {
        const p = getPos(e);
        setCursorDown(true);
        setLines((prev) => [...prev, [p.x, p.y]]);
        send(p, true);
    }

    function handleMove(e) {
        const p = getPos(e);
        if (cursorDown) {
            setLines((prev) => {
                if (prev.length === 0) {
                    return prev;
                }
                const next = prev.slice();
                next[next.length - 1] = [...next[next.length - 1], p.x, p.y];
                return next;
            });
        }
        send(p, cursorDown);
    }

    function handleUp() {
        setCursorDown(false);
        send(posRef.current, false);
    }

    function pointsAttr(flat) {
        const pairs = [];
        for (let i = 0; i < flat.length; i += 2) {
            pairs.push(`${flat[i]},${flat[i + 1]}`);
        }
        return pairs.join(" ");
    }

    return (
        <VariableBase
            connectedVariables={connectedVariables}
            widgetTitle="Cursor input"
            getWidgetProperty={getWidgetProperty}
            setWidgetProperty={setWidgetProperty}
            pending={pending}
        >
            <svg
                ref={svgRef}
                width={canvasRange.x}
                height={canvasRange.y}
                style={{ border: "1px solid grey", touchAction: "none" }}
                onMouseDown={handleDown}
                onMouseMove={handleMove}
                onMouseUp={handleUp}
                onTouchStart={handleDown}
                onTouchMove={handleMove}
                onTouchEnd={handleUp}
            >
                {lines.map((flat, i) => (
                    <polyline
                        key={i}
                        points={pointsAttr(flat)}
                        fill="none"
                        stroke="#df4b26"
                        strokeWidth={5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                ))}
            </svg>
            <Button
                onClick={() => {
                    setLines([]);
                }}
            >
                Clear
            </Button>
        </VariableBase>
    );
};
export default VariableCursor;
