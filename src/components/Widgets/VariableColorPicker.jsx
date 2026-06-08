import { useState, useRef } from "react";
import { RgbColorPicker } from "react-colorful";
import { NoTheme } from "react-lazy-dark-theme";

import VariableBase from "./VariableBase";

const VariableColorPicker = ({ connectedVariables, setVariableOnMcu, getWidgetProperty, setWidgetProperty, pending }) => {
    const variableName = getWidgetProperty("variableName");
    // color defaults to "latest" (only the newest color matters)
    const sendMode = getWidgetProperty("sendMode") || "latest";
    // resolution: skip a new color when its Euclidean distance (in RGB) from the last recorded one
    // is below this. Set 0 to send every change.
    const resolution = getWidgetProperty("resolution") ?? 3;

    const [color, setColor] = useState({ r: 16, g: 0, b: 0 });
    const lastSentRef = useRef(null); // last recorded [r, g, b]

    // keep the picker responsive (setColor always); send (filtered by resolution + paced by the hook)
    const handleChange = (c) => {
        setColor(c);
        const last = lastSentRef.current;
        if (last && Math.hypot(c.r - last[0], c.g - last[1], c.b - last[2]) < resolution) {
            return;
        }
        lastSentRef.current = [c.r, c.g, c.b];
        setVariableOnMcu(variableName, [c.r, c.g, c.b], sendMode);
    };

    return (
        <VariableBase
            connectedVariables={connectedVariables}
            widgetTitle="Color picker"
            getWidgetProperty={getWidgetProperty}
            setWidgetProperty={setWidgetProperty}
            pending={pending}
        >
            {/* exclude only the picker panel from the dark-theme inversion so colors are true */}
            <NoTheme>
                <RgbColorPicker color={color} onChange={handleChange} />
            </NoTheme>
        </VariableBase>
    );
};
export default VariableColorPicker;
