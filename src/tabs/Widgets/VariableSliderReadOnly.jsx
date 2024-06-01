import Slider from "@mui/material/Slider";
import VariableBase from "./VariableBase";

const VariableSliderReadOnly = ({ connectedVariables, getVariableOnMcu, getWidgetProperty, setWidgetProperty }) => {
    const { rangeMin, rangeMax } = getWidgetProperty("extra");
    const variableName = getWidgetProperty("variableName");

    return (
        <VariableBase
            connectedVariables={connectedVariables}
            widgetTitle="Meter"
            getWidgetProperty={getWidgetProperty}
            setWidgetProperty={setWidgetProperty}
        >
            {getVariableOnMcu(variableName) != undefined ? (
                <Slider
                    sx={{ width: 300 }}
                    min={rangeMin}
                    max={rangeMax}
                    value={getVariableOnMcu(variableName)}
                    // disabled
                    valueLabelDisplay="on"
                />
            ) : (
                <></>
            )}
        </VariableBase>
    );
};
export default VariableSliderReadOnly;
