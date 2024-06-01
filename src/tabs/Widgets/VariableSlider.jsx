import { useState, useEffect } from "react";
import Slider from "@mui/material/Slider";
import VariableBase from "./VariableBase";
import { useSlowChangeState } from "./utilities";

const VariableSlider = ({ connectedVariables, setVariableOnMcu, getWidgetProperty, setWidgetProperty }) => {
    const { rangeMin, rangeMax, set: value } = getWidgetProperty("extra");
    const setValue = (value) => {
        setWidgetProperty("extra", { rangeMin: rangeMin, rangeMax: rangeMax, set: value });
    };
    const variableName = getWidgetProperty("variableName");

    // const [value, setValue] = useState(-1);
    const slowValue = useSlowChangeState(value, 0.2);

    useEffect(() => {
        setVariableOnMcu(variableName, value);
    }, [slowValue]);

    return (
        <VariableBase
            connectedVariables={connectedVariables}
            widgetTitle="Slider"
            getWidgetProperty={getWidgetProperty}
            setWidgetProperty={setWidgetProperty}
        >
            <Slider
                sx={{ width: 300 }}
                min={rangeMin}
                max={rangeMax}
                step={0.1}
                value={value != undefined ? value : 0}
                onChange={(event) => {
                    setValue(event.target.value);
                }}
                valueLabelDisplay="on"
                onMouseUp={() => {
                    setVariableOnMcu(variableName, value);
                }}
            />
        </VariableBase>
    );
};
export default VariableSlider;
