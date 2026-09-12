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
                onPointerDown={(event) => {
                    event.currentTarget.setPointerCapture(event.pointerId);
                    setVariableOnMcu(variableName, true);
                }}
                onPointerUp={() => {
                    setVariableOnMcu(variableName, false);
                }}
                onPointerCancel={() => setVariableOnMcu(variableName, false)}
                onKeyDown={(event) => {
                    if (!event.repeat && [" ", "Enter"].includes(event.key)) setVariableOnMcu(variableName, true);
                }}
                onKeyUp={(event) => {
                    if ([" ", "Enter"].includes(event.key)) setVariableOnMcu(variableName, false);
                }}
                onBlur={() => setVariableOnMcu(variableName, false)}
            >
                {buttonText}
            </Button>
        </VariableBase>
    );
};
export default VariableButton;
