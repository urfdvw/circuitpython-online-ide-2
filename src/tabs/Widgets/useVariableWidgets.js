import { useState } from "react";
export default function useVariableWidgets() {
    // planned feature
    const [variableWidgets, setVariableWidgets] = useState([
        {
            id: 1,
            widgetType: "VariableSet",
            variableName: "a",
            description: "set a test variable",
            x: 30,
            y: 30,
            width: "auto",
            height: "auto",
        },
        {
            id: 2,
            widgetType: "VariableDisplay",
            variableName: "a",
            description: "display a test variable",
            x: 30,
            y: 30,
            width: "auto",
            height: "auto",
        },
        {
            id: 3,
            widgetType: "VariableCursor",
            variableName: "draw_pos",
            description: "control the drawing robot",
            x: 30,
            y: 30,
            width: "auto",
            height: "auto",
            extra: {
                x_min: -25,
                x_max: 15,
                y_min: 45,
                y_max: 85,
            },
        },
    ]);
    /**
     * {
     *  id: int,
     *  widgetType: string,
     *  variableName: string,
     *  description: string,
     *  extra: obj,
     *  x: number,
     *  y: number,
     *  width: number,
     *  height: number,
     * }
     * position and size are planned feature, ignore for now
     */

    function getWidget(widgets, id) {
        return widgets.filter((w) => {
            return w.id === id;
        })[0];
    }

    function getWidgetProperty(id, propertyName) {
        try {
            return getWidget(variableWidgets, id)[propertyName];
        } catch (e) {
            console.error(e);
        }
    }

    function setWidgetProperty(id, propertyName, newValue) {
        setVariableWidgets((widgets) => {
            return [
                ...widgets.filter((w) => {
                    return w.id !== id;
                }),
                {
                    ...getWidget(widgets, id),
                    [propertyName]: newValue,
                },
            ];
        });
    }
    return { variableWidgets, setVariableWidgets, getWidgetProperty, setWidgetProperty };
}
