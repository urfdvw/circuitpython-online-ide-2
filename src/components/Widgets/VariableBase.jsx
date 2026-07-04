import { useContext, useEffect, useState } from "react";
import { Autocomplete, TextField, Typography, Box, Tooltip, IconButton } from "@mui/material";
import OpenWithIcon from "@mui/icons-material/OpenWith";
import { Rnd } from "react-rnd";
import WidgetContext from "./WidgetsContext";

const DRAG_HANDLE_CLASS = "widget-drag-handle";

const style = {
    border: "solid 1px #ddd",
    background: "#f0f0f0",
    overflow: "hidden",
    borderRadius: "8pt",
    padding: "10pt",
    touchAction: "none",
};

const VariableBase = ({ connectedVariables, widgetTitle, getWidgetProperty, setWidgetProperty, children, pending }) => {
    const variableName = getWidgetProperty("variableName");
    const setVariableName = (name) => setWidgetProperty("variableName", name);
    const description = getWidgetProperty("description");
    const x = getWidgetProperty("x");
    const setX = (x) => setWidgetProperty("x", x);
    const y = getWidgetProperty("y");
    const setY = (y) => setWidgetProperty("y", y);

    const { layoutIsLocked } = useContext(WidgetContext);
    const [position, setPosition] = useState({ x: x ?? 0, y: y ?? 0 });

    useEffect(() => {
        setPosition({ x: x ?? 0, y: y ?? 0 });
    }, [x, y]);

    return (
        <Rnd
            style={style}
            size={{ width: "auto", height: "auto" }}
            position={position}
            bounds="parent"
            onDrag={(e, d) => {
                setPosition({ x: d.x, y: d.y });
            }}
            onDragStop={(e, d) => {
                setPosition({ x: d.x, y: d.y });
                setX(d.x);
                setY(d.y);
            }}
            disableDragging={layoutIsLocked}
            dragHandleClassName={DRAG_HANDLE_CLASS}
            enableResizing={false}
        >
            <Box
                sx={{
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="h5" component="h2">
                        {widgetTitle}
                    </Typography>
                    {/* read-ack indicator: only shown for write widgets (pending !== undefined) */}
                    {pending !== undefined && (
                        <Tooltip
                            title={
                                pending
                                    ? "Waiting for the board to read this value"
                                    : "In sync — last value read by the board"
                            }
                        >
                            <Box
                                sx={{
                                    width: 12,
                                    height: 12,
                                    borderRadius: "50%",
                                    flexShrink: 0,
                                    bgcolor: pending ? "warning.main" : "success.main",
                                    boxShadow: pending ? "0 0 6px 1px" : "none",
                                    transition: "background-color 120ms",
                                }}
                            />
                        </Tooltip>
                    )}
                    {!layoutIsLocked && (
                        <Tooltip title="Drag to move">
                            <IconButton
                                className={DRAG_HANDLE_CLASS}
                                size="small"
                                sx={{ ml: "auto", cursor: "move", touchAction: "none" }}
                            >
                                <OpenWithIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>
                <Typography component="dir">{description}</Typography>
                <br />
                <Autocomplete
                    isOptionEqualToValue={() => true}
                    freeSolo={true}
                    disableClearable
                    id="combo-box-demo"
                    value={variableName}
                    onChange={(e, newValue) => {
                        setVariableName(newValue.label);
                    }}
                    options={Object.keys(connectedVariables).map((key) => {
                        return {
                            label: key,
                        };
                    })}
                    renderInput={(params) => <TextField {...params} label="Variable" />}
                />
                <br />
                {children}
            </Box>
        </Rnd>
    );
};
export default VariableBase;
