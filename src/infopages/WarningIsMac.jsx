import MarkdownExtended from "../layout/MarkdownExtended";
import WarningModal from "../layout/WarningModal";
import info from "../documents/info/WarringIsMac.md";

export default function WarningIsMac() {
    return (
        <WarningModal closeEnabled={true}>
            <MarkdownExtended>{info}</MarkdownExtended>
        </WarningModal>
    );
}
