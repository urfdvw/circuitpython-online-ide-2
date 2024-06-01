import { useState, useEffect } from "react";
import Button from "@mui/material/Button";

import { Stage, Layer, Line } from "react-konva";

import VariableBase from "./VariableBase";
import { useSlowChangeState } from "./utilities";

function round(num) {
    return Math.round(num * 10) / 10;
}

const VariableCursor = ({ connectedVariables, setVariableOnMcu, getWidgetProperty, setWidgetProperty }) => {
    const variableName = getWidgetProperty("variableName");

    const [tool, setTool] = useState("pen");
    const [lines, setLines] = useState([]);
    const [cursorDown, setCursorDown] = useState(false);

    const [pos, setPos] = useState({
        x: 0,
        y: 0,
    });

    const xMin = getWidgetProperty("xMin");
    const xMax = getWidgetProperty("xMax");
    const yMin = getWidgetProperty("yMin");
    const yMax = getWidgetProperty("yMax");
    const canvasRange = { x: 300, y: 300 };
    // send data on change
    const slowPos = useSlowChangeState(pos, 0.1);
    const slowCursorDown = useSlowChangeState(cursorDown, 0.1);

    useEffect(() => {
        setVariableOnMcu(variableName, {
            x: round((pos.x / canvasRange.x) * (xMax - xMin) + xMin),
            y: round(((canvasRange.y - pos.y) / canvasRange.y) * (yMax - yMin) + yMin),
            z: cursorDown ? 1 : 0,
        });
    }, [slowPos, slowCursorDown]);

    const handleMouseDown = (e) => {
        const pos = e.target.getStage().getPointerPosition();
        // send pos
        setPos({
            x: pos.x,
            y: pos.y,
        });
        setCursorDown(true);

        setLines([...lines, { tool, points: [pos.x, pos.y] }]);
    };

    const handleMouseMove = (e) => {
        const pos = e.target.getStage().getPointerPosition();
        // send pos
        setPos({
            x: pos.x,
            y: pos.y,
        });

        // no drawing - skipping
        if (!cursorDown) {
            return;
        }
        let lastLine = lines[lines.length - 1];
        // add point
        lastLine.points = lastLine.points.concat([pos.x, pos.y]);

        // replace last
        lines.splice(lines.length - 1, 1, lastLine);
        setLines(lines.concat());
    };

    const handleMouseUp = () => {
        setCursorDown(false);
    };

    return (
        <VariableBase
            connectedVariables={connectedVariables}
            widgetTitle="Cursor input"
            getWidgetProperty={getWidgetProperty}
            setWidgetProperty={setWidgetProperty}
        >
            <Stage
                style={{ border: "1px solid grey" }}
                width={canvasRange.x}
                height={canvasRange.y}
                onMouseDown={handleMouseDown}
                onMousemove={handleMouseMove}
                onMouseup={handleMouseUp}
            >
                <Layer>
                    {lines.map((line, i) => (
                        <Line
                            key={i}
                            points={line.points}
                            stroke="#df4b26"
                            strokeWidth={5}
                            tension={0.5}
                            lineCap="round"
                            lineJoin="round"
                            globalCompositeOperation={line.tool === "eraser" ? "destination-out" : "source-over"}
                        />
                    ))}
                </Layer>
            </Stage>
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
