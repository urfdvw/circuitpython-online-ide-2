import { useState } from "react";
export default function useVariableWidgets() {
    // planned feature
    const [variableWidgets, setVariableWidgets] = useState([
        {
            id: 1,
            widgetType: "VariableSet",
            variableName: "a",
            description: "a test variable",
        },
    ]);
    /**
     * {
     *  id: int,
     *  widgetType: string,
     *  variableName: string,
     *  description: string,
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

    function variableName(id) {
        try {
            return getWidget(variableWidgets, id).variableName;
        } catch (e) {
            console.error(e);
            return "";
        }
    }
    function description(id) {
        try {
            return getWidget(variableWidgets, id).description;
        } catch (e) {
            console.error(e);
            return "";
        }
    }
    function setVariableName(id, newVariableName) {
        setVariableWidgets((widgets) => {
            return [
                ...widgets.filter((w) => {
                    return w.id !== id;
                }),
                {
                    ...getWidget(widgets, id),
                    variableName: newVariableName,
                },
            ];
        });
    }
    function setDescription(id, newDescription) {
        setVariableWidgets((widgets) => {
            return [
                ...widgets.filter((w) => {
                    return w.id !== id;
                }),
                {
                    ...getWidget(widgets, id),
                    description: newDescription,
                },
            ];
        });
    }
    return { variableWidgets, setVariableWidgets, variableName, description, setVariableName, setDescription };
}
