import { useState, useRef, useEffect } from "react";
import FormControl from "@mui/material/FormControl";
import TextField from "@mui/material/TextField";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";

import { Stage, Layer, Line, Text } from "react-konva";

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

    const range = getWidgetProperty("extra");
    const canvasRange = { x: 300, y: 300 };
    // send data on change
    const slowPos = useSlowChangeState(pos, 0.2);
    const slowCursorDown = useSlowChangeState(cursorDown, 0.2);

    useEffect(() => {
        setVariableOnMcu(variableName, {
            x: round((pos.x / canvasRange.x) * (range.x_max - range.x_min) + range.x_min),
            y: round(((canvasRange.y - pos.y) / canvasRange.y) * (range.y_max - range.y_min) + range.y_min),
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
            <Button
                onClick={() => {
                    setLines([]);
                }}
            >
                Clear
            </Button>
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
        </VariableBase>
    );
};
export default VariableCursor;
