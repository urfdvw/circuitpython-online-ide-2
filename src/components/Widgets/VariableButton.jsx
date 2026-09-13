import useMomentaryButton from "../../hooks/useMomentaryButton";
import Button from "@mui/material/Button";

import VariableBase from "./VariableBase";

const VariableButton = ({ connectedVariables, setVariableOnMcu, getWidgetProperty, setWidgetProperty, pending }) => {
    const variableName = getWidgetProperty("variableName");
    const buttonText = getWidgetProperty("buttonText");
    const pressHandlers = useMomentaryButton(variableName, setVariableOnMcu);

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
                {...pressHandlers}
            >
                {buttonText}
            </Button>
        </VariableBase>
    );
};
export default VariableButton;
