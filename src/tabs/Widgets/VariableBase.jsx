import { useState } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import { Input } from "@mui/material";
import { InputAdornment } from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import { IconButton } from "@mui/material";
import ClickAwayListener from "react-click-away-listener";

const VariableBase = ({
    connectedVariables,
    widgetTitle,
    variableName,
    setVariableName,
    hasDescription,
    description,
    setDescription,
}) => {
    const [editingDescription, setEditingDescription] = useState(false);
    return (
        <>
            {widgetTitle}
            <br />
            {hasDescription ? (
                <ClickAwayListener
                    onClickAway={() => {
                        setEditingDescription(false);
                    }}
                >
                    <span
                        onClick={() => {
                            setEditingDescription(true);
                        }}
                    >
                        {editingDescription ? (
                            <Input
                                value={description}
                                onChange={(event) => {
                                    setDescription(event.target.value);
                                }}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") setEditingDescription(false);
                                }}
                            />
                        ) : (
                            description
                        )}
                    </span>
                </ClickAwayListener>
            ) : (
                <></>
            )}
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
        </>
    );
};
export default VariableBase;
