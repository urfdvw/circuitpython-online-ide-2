import { useState, useEffect, useRef } from "react";
import Button from "@mui/material/Button";

import VariableBase from "./VariableBase";
import { useSlowChangeState } from "./utilities";

function round(num) {
    return Math.round(num * 10) / 10;
}

const VariableCursor = ({ connectedVariables, setVariableOnMcu, getWidgetProperty, setWidgetProperty }) => {
    const variableName = getWidgetProperty("variableName");

    const xMin = getWidgetProperty("xMin");
    const xMax = getWidgetProperty("xMax");
    const yMin = getWidgetProperty("yMin");
    const yMax = getWidgetProperty("yMax");
    const period = getWidgetProperty("period") === null ? 0.1 : getWidgetProperty("period");

    const canvasRange = { x: 300, y: (300 / (xMax - xMin)) * (yMax - yMin) };

    const svgRef = useRef(null);
    const [lines, setLines] = useState([]); // each line is a flat [x0, y0, x1, y1, ...]
    const [cursorDown, setCursorDown] = useState(false);
    const [pos, setPos] = useState({ x: 0, y: 0 });

    // throttle the values sent to the board
    const slowPos = useSlowChangeState(pos, period);
    const slowCursorDown = useSlowChangeState(cursorDown, period);

    useEffect(() => {
        setVariableOnMcu(variableName, [
            round((pos.x / canvasRange.x) * (xMax - xMin) + xMin),
            round(((canvasRange.y - pos.y) / canvasRange.y) * (yMax - yMin) + yMin),
            cursorDown ? 1 : 0,
        ]);
    }, [slowPos, slowCursorDown]);

    function getPos(e) {
        const rect = svgRef.current.getBoundingClientRect();
        const point = e.touches && e.touches.length ? e.touches[0] : e;
        return { x: point.clientX - rect.left, y: point.clientY - rect.top };
    }

    function handleDown(e) {
        const p = getPos(e);
        setPos(p);
        setCursorDown(true);
        setLines((prev) => [...prev, [p.x, p.y]]);
    }

    function handleMove(e) {
        const p = getPos(e);
        setPos(p);
        if (!cursorDown) {
            return;
        }
        setLines((prev) => {
            if (prev.length === 0) {
                return prev;
            }
            const next = prev.slice();
            next[next.length - 1] = [...next[next.length - 1], p.x, p.y];
            return next;
        });
    }

    function handleUp() {
        setCursorDown(false);
    }

    function pointsAttr(flat) {
        // flat [x0, y0, x1, y1, ...] -> "x0,y0 x1,y1 ..."
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
