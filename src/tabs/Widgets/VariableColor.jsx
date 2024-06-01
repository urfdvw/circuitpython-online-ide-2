import { useState, useEffect } from "react";
import { RgbColorPicker } from "react-colorful";
import { useSlowChangeState } from "./utilities";
import { NoTheme } from "../../react-lazy-dark-theme";

import VariableBase from "./VariableBase";

const VariableColor = ({ connectedVariables, setVariableOnMcu, getWidgetProperty, setWidgetProperty }) => {
    const variableName = getWidgetProperty("variableName");

    const [color, setColor] = useState({
        r: 16,
        g: 0,
        b: 0,
    });

    // send data on change
    const slowColor = useSlowChangeState(color, 0.1);

    const handleSend = (color) => {
        setVariableOnMcu(variableName, [color.r, color.g, color.b]);
    };

    useEffect(() => {
        handleSend(color);
    }, [slowColor]);

    return (
        <VariableBase
            connectedVariables={connectedVariables}
            widgetTitle="Color picker"
            getWidgetProperty={getWidgetProperty}
            setWidgetProperty={setWidgetProperty}
        >
            <NoTheme>
                <RgbColorPicker
                    color={color}
                    onChange={setColor}
                    onMouseUp={() => {
                        handleSend(color);
                    }}
                    onMouseLeave={() => {
                        handleSend(color);
                    }}
                />
            </NoTheme>
        </VariableBase>
    );
};
export default VariableColor;
