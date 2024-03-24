import MarkdownExtended from "../layout/MarkdownExtended";
import aboutMarkdown from "../documents/info/WarringIsMac.md";
import WarningModal from "../layout/WarningModal";

export default function WarningIsMac() {
    return (
        <WarningModal closeEnabled={true}>
            <MarkdownExtended>{aboutMarkdown}</MarkdownExtended>
        </WarningModal>
    );
}
