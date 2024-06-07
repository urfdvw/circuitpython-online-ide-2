import Slider from "@mui/material/Slider";
import VariableBase from "./VariableBase";

const VariableSliderReadOnly = ({ connectedVariables, getVariableOnMcu, getWidgetProperty, setWidgetProperty }) => {
    const rangeMin = getWidgetProperty("rangeMin");
    const rangeMax = getWidgetProperty("rangeMax");
    const variableName = getWidgetProperty("variableName");

    return (
        <VariableBase
            connectedVariables={connectedVariables}
            widgetTitle="Meter"
            getWidgetProperty={getWidgetProperty}
            setWidgetProperty={setWidgetProperty}
        >
            <Slider
                sx={{ width: 300 }}
                min={rangeMin}
                max={rangeMax}
                value={getVariableOnMcu(variableName) != undefined ? getVariableOnMcu(variableName) : 0}
                // disabled
                valueLabelDisplay="on"
            />
        </VariableBase>
    );
};
export default VariableSliderReadOnly;
