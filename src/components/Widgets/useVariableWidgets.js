import { useState } from "react";

export default function useVariableWidgets() {
    const [variableWidgets, setVariableWidgets] = useState([]);

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
        // order-preserving update (the dragged widget must keep its place in the
        // render list, otherwise rapid onDrag updates reorder the DOM mid-drag)
        setVariableWidgets((widgets) =>
            widgets.map((w) => (w.id === id ? { ...w, [propertyName]: newValue } : w))
        );
    }

    return { variableWidgets, setVariableWidgets, getWidgetProperty, setWidgetProperty };
}
