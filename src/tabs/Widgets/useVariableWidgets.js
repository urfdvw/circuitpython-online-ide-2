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
        //         x_min: -25,
        //         x_max: 15,
        //         y_min: 45,
        //         y_max: 85,
        // },
        // {
        //     id: 4,
        //     widgetType: "Slider",
        //     variableName: "thr",
        //     description: "volume threshold",
        //     x: 30,
        //     y: 30,
        //     rangeMin: 0,
        //     rangeMax: 15,
        //     step: 0.1,
        //     set: 7,
        // },
        // {
        //     id: 5,
        //     widgetType: "SliderReadOnly",
        //     variableName: "vol",
        //     description: "volume",
        //     x: 30,
        //     y: 30,
        //     rangeMin: 0,
        //     rangeMax: 15,
        // },
        // {
        //     id: 6,
        //     widgetType: "Color",
        //     variableName: "cur_color",
        //     description: "Color of the cursor",
        //     x: 30,
        //     y: 30,
        // },
    ]);

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
