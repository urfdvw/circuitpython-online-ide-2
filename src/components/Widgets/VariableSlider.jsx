import Slider from "@mui/material/Slider";
import VariableBase from "./VariableBase";

const VariableSlider = ({ connectedVariables, setVariableOnMcu, getWidgetProperty, setWidgetProperty, pending }) => {
    const rangeMin = getWidgetProperty("rangeMin");
    const rangeMax = getWidgetProperty("rangeMax");
    const step = getWidgetProperty("step");
    const value = getWidgetProperty("set");
    const setValue = (value) => {
        setWidgetProperty("set", value);
    };
    const variableName = getWidgetProperty("variableName");
    // slider defaults to "latest" (only the newest position matters)
    const sendMode = getWidgetProperty("sendMode") || "latest";

    return (
        <VariableBase
            connectedVariables={connectedVariables}
            widgetTitle="Slider"
            getWidgetProperty={getWidgetProperty}
            setWidgetProperty={setWidgetProperty}
            pending={pending}
        >
            <Slider
                sx={{ width: 300 }}
                min={rangeMin != undefined ? rangeMin : 0}
                max={rangeMax != undefined ? rangeMax : 10}
                step={step != undefined ? step : 1}
                value={value != undefined ? value : 0}
                onChange={(event) => {
                    // send every change; the hook paces by the board's read-ack per `sendMode`
                    const v = event.target.value;
                    setValue(v);
                    setVariableOnMcu(variableName, v, sendMode);
                }}
                valueLabelDisplay="on"
            />
        </VariableBase>
    );
};
export default VariableSlider;
