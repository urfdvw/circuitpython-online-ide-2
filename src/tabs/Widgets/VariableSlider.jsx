import { useState, useEffect } from "react";
import Slider from "@mui/material/Slider";
import VariableBase from "./VariableBase";
import { useSlowChangeState } from "./utilities";

const VariableSlider = ({ connectedVariables, setVariableOnMcu, getWidgetProperty, setWidgetProperty }) => {
    const { rangeMin, rangeMax } = getWidgetProperty("extra");

    const [value, setValue] = useState(rangeMin);
    const variableName = getWidgetProperty("variableName");
    const slowValue = useSlowChangeState(value, 0.2);
    // setVariableOnMcu(variableName, variableValue);

    useEffect(() => {
        setVariableOnMcu(variableName, value);
    }, [slowValue]);

    return (
        <VariableBase
            connectedVariables={connectedVariables}
            widgetTitle="Set Variable"
            getWidgetProperty={getWidgetProperty}
            setWidgetProperty={setWidgetProperty}
        >
            <Slider
                sx={{ width: 300 }}
                min={rangeMin}
                max={rangeMax}
                step={0.1}
                value={value}
                onChange={(event) => {
                    setValue(event.target.value);
                }}
                valueLabelDisplay="auto"
            />
        </VariableBase>
    );
};
export default VariableSlider;
