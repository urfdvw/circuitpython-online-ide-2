import { useState } from "react";
import FormControl from "@mui/material/FormControl";
import TextField from "@mui/material/TextField";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";

import VariableBase from "./VariableBase";

const VariableSet = ({ connectedVariables, setVariableOnMcu, getWidgetProperty, setWidgetProperty }) => {
    const [value, setValue] = useState("0");
    const [type, setType] = useState("int");
    const variableName = getWidgetProperty("variableName");

    const handleSubmit = (event) => {
        event.preventDefault();
        let variableValue;
        if (type === "int") {
            variableValue = parseInt(value);
        } else if (type === "float") {
            variableValue = parseFloat(value);
        } else if (type === "string") {
            variableValue = String(value);
        } else if (type === "bool") {
            variableValue = value.trim().toLowerCase() === "true" ? true : false;
        } else if (type === "json") {
            try {
                variableValue = JSON.parse(value);
            } catch {
                alert("Input is not a valid json");
            }
        }
        setVariableOnMcu(variableName, variableValue);
        // don't up date variable value on web directly, let the change reflected by update echo
    };
    return (
        <VariableBase
            connectedVariables={connectedVariables}
            widgetTitle="Set Variable"
            getWidgetProperty={getWidgetProperty}
            setWidgetProperty={setWidgetProperty}
        >
            <TextField
                value={value}
                onChange={(event) => {
                    setValue(event.target.value);
                }}
                label="value"
            ></TextField>

            <FormControl fullWidth>
                <InputLabel id="demo-simple-select-label">type</InputLabel>
                <Select
                    labelId="demo-simple-select-label"
                    value={type}
                    label="type"
                    onChange={(e) => {
                        setType(e.target.value);
                    }}
                >
                    <MenuItem value={"int"}>int</MenuItem>
                    <MenuItem value={"float"}>float</MenuItem>
                    <MenuItem value={"string"}>string</MenuItem>
                    <MenuItem value={"bool"}>bool</MenuItem>
                    <MenuItem value={"json"}>json</MenuItem>
                </Select>
            </FormControl>

            <Button size="large" variant="contained" onClick={handleSubmit}>
                Set
            </Button>
        </VariableBase>
    );
};
export default VariableSet;
