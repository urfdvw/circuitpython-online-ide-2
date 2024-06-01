import { useState, useContext } from "react";
import { Autocomplete, TextField, Typography, Box } from "@mui/material";
import { Rnd } from "react-rnd";
import WidgetContext from "./WidgetsContext";

const style = {
    border: "solid 1px #ddd",
    background: "#f0f0f0",
    overflow: "hidden",
    borderRadius: "8pt",
    padding: "10pt",
};

const VariableBase = ({ connectedVariables, widgetTitle, getWidgetProperty, setWidgetProperty, children }) => {
    const variableName = getWidgetProperty("variableName");
    const setVariableName = (name) => setWidgetProperty("variableName", name);
    const description = getWidgetProperty("description");
    const x = getWidgetProperty("x");
    const setX = (x) => setWidgetProperty("x", x);
    const y = getWidgetProperty("y");
    const setY = (y) => setWidgetProperty("y", y);

    const { layoutIsLocked } = useContext(WidgetContext);

    return (
        <Rnd
            style={style}
            size={{ width: "auto", height: "auto" }}
            position={{ x: x, y: y }}
            onDragStop={(e, d) => {
                setX(d.x);
                setY(d.y);
            }}
            disableDragging={layoutIsLocked}
            enableResizing={false}
        >
            <Box
                sx={{
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                <Typography variant="h5" component="h2">
                    {widgetTitle}
                </Typography>
                <Typography component="dir">{description}</Typography>
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
                    // sx={{ width: "100" }}
                    renderInput={(params) => <TextField {...params} label="Variable" />}
                />
                <br />
                {children}
            </Box>
        </Rnd>
    );
};
export default VariableBase;
