import MarkdownExtended from "../layout/MarkdownExtended";
import WarningModal from "../layout/WarningModal";
import info from "../documents/info/ErrorIsNotChrome.md";

export default function ErrorIsNotChrome() {
    return (
        <WarningModal closeEnabled={false}>
            <MarkdownExtended>{info}</MarkdownExtended>
        </WarningModal>
    );
}
