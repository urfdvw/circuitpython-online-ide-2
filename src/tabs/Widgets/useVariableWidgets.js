import { useState } from "react";
export default function useVariableWidgets() {
    // planned feature
    const [variableWidgets, setVariableWidgets] = useState([
        // {
        //     id: 1,
        //     widgetType: "Set",
        //     variableName: "a",
        //     description: "set a test variable",
        //     x: 30,
        //     y: 30,
        // },
        // {
        //     id: 2,
        //     widgetType: "Display",
        //     variableName: "a",
        //     description: "display a test variable",
        //     x: 30,
        //     y: 30,
        // },
        // {
        //     id: 3,
        //     widgetType: "Cursor",
        //     variableName: "draw_pos",
        //     description: "control the drawing robot",
        //     x: 30,
        //     y: 30,
        //     extra: {
        //         x_min: -25,
        //         x_max: 15,
        //         y_min: 45,
        //         y_max: 85,
        //     },
        // },
        {
            id: 4,
            widgetType: "Slider",
            variableName: "thr",
            description: "volume threshold",
            x: 30,
            y: 30,
            extra: { rangeMin: 0, rangeMax: 15, set: 7 },
        },
        {
            id: 5,
            widgetType: "SliderReadOnly",
            variableName: "vol",
            description: "volume",
            x: 30,
            y: 30,
            extra: { rangeMin: 0, rangeMax: 15 },
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
