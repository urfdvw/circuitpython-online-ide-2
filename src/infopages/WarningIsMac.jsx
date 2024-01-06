import HyperLink from "../layout/HyperLink";
import WarningModal from "../layout/WarningModal";

export default function WarningIsMac() {
    return (
        <WarningModal title="Warning for MacOS users!" closeEnabled={true}>
            If you have issues writing files to microcontrollers, it is not a bug of the IDE or CircuitPython, but a
            known issue of MacOS 14 (Sonoma). Please check
            <HyperLink
                text="this link"
                link="https://github.com/adafruit/circuitpython/issues/8449#issuecomment-1743922060"
            />
            for a walkaround that temporary fix this issue.
        </WarningModal>
    );
}
