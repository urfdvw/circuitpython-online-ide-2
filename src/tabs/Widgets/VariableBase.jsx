import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import { Input } from "@mui/material";
import Typography from "@mui/material/Typography";

const VariableBase = ({ connectedVariables, widgetTitle, getWidgetProperty, setWidgetProperty, children }) => {
    const variableName = getWidgetProperty("variableName");
    const setVariableName = (name) => setWidgetProperty("variableName", name);
    const description = getWidgetProperty("description");
    const setDescription = (description) => setWidgetProperty("description", description);

    return (
        <>
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
        </>
    );
};
export default VariableBase;
