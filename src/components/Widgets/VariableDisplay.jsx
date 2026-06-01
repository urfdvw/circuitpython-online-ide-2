import VariableBase from "./VariableBase";

const VariableDisplay = ({ connectedVariables, getVariableOnMcu, getWidgetProperty, setWidgetProperty }) => {
    const variableName = getWidgetProperty("variableName");

    return (
        <VariableBase
            connectedVariables={connectedVariables}
            widgetTitle="Display Variable"
            getWidgetProperty={getWidgetProperty}
            setWidgetProperty={setWidgetProperty}
        >
            <pre>{JSON.stringify(getVariableOnMcu(variableName), null, 2)}</pre>
        </VariableBase>
    );
};
export default VariableDisplay;
