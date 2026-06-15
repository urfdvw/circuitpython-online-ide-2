import Button from "@mui/material/Button";

import VariableBase from "./VariableBase";

const VariableButton = ({ connectedVariables, setVariableOnMcu, getWidgetProperty, setWidgetProperty, pending }) => {
    const variableName = getWidgetProperty("variableName");
    const buttonText = getWidgetProperty("buttonText");

    return (
        <VariableBase
            connectedVariables={connectedVariables}
            widgetTitle="Button"
            getWidgetProperty={getWidgetProperty}
            setWidgetProperty={setWidgetProperty}
            pending={pending}
        >
            <Button
                size="large"
                variant="contained"
                onMouseDown={() => {
                    setVariableOnMcu(variableName, true);
                }}
                onMouseUp={() => {
                    setVariableOnMcu(variableName, false);
                }}
            >
                {buttonText}
            </Button>
        </VariableBase>
    );
};
export default VariableButton;
