import MarkdownExtended from "../layout/MarkdownExtended";
import WarningModal from "../layout/WarningModal";
import info from "../documents/info/WarringIsAndroid.md";

export default function WarningIsAndroid() {
    return (
        <WarningModal closeEnabled={true}>
            <MarkdownExtended>{info}</MarkdownExtended>
        </WarningModal>
    );
}
