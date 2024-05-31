import { useState, useContext } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import { Input } from "@mui/material";
import Typography from "@mui/material/Typography";
import { Rnd } from "react-rnd";
import LockOpenOutlinedIcon from "@mui/icons-material/LockOpenOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { IconButton, Tooltip } from "@mui/material";
import WidgetContext from "./WidgetsContext";

const style = {
    // display: "flex",

    alignItems: "center",
    justifyContent: "center",
    border: "solid 1px #ddd",
    background: "#f0f0f0",
    overflow: "hidden",
};

const VariableBase = ({ connectedVariables, widgetTitle, getWidgetProperty, setWidgetProperty, children }) => {
    const variableName = getWidgetProperty("variableName");
    const setVariableName = (name) => setWidgetProperty("variableName", name);
    const description = getWidgetProperty("description");
    const setDescription = (description) => setWidgetProperty("description", description);
    const x = getWidgetProperty("x");
    const setX = (x) => setWidgetProperty("x", x);
    const y = getWidgetProperty("y");
    const setY = (y) => setWidgetProperty("y", y);
    const width = getWidgetProperty("width");
    const setWidth = (width) => setWidgetProperty("width", width);
    const height = getWidgetProperty("height");
    const sethHeight = (height) => setWidgetProperty("height", height);

    const {layoutIsLocked} = useContext(WidgetContext)

    return (
        <Rnd
            style={style}
            size={{ width: width, height: height }}
            position={{ x: x, y: y }}
            onDragStop={(e, d) => {
                setX(d.x);
                setY(d.y);
            }}
            onResizeStop={(e, direction, ref, delta, position) => {
                setX(position.x);
                setY(position.y);
                setWidth(ref.style.width);
                sethHeight(ref.style.height);
            }}
            disableDragging={layoutIsLocked}
            enableResizing={true}
        >
            <Typography variant="h7" component="h2">
                {widgetTitle}
            </Typography>
            <br />
            <Input
                placeholder="add description here"
                value={description}
                onChange={(event) => {
                    setDescription(event.target.value);
                }}
            />
            <br />
            <Autocomplete
                isOptionEqualToValue={(option, value) => {
                    // return option.label === value
                    return true;
                }}
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
                sx={{ width: 100 }}
                renderInput={(params) => <TextField {...params} label="Variable" />}
            />
            <br />
            {children}
        </Rnd>
    );
};
export default VariableBase;
