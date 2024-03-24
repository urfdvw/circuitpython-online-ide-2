import MarkdownExtended from "../layout/MarkdownExtended";
import WarningModal from "../layout/WarningModal";
import info from "../documents/info/ErrorIsMobile.md";

export default function ErrorIsMobile() {
    return (
        <WarningModal closeEnabled={false}>
            <MarkdownExtended>{info}</MarkdownExtended>
        </WarningModal>
    );
}
