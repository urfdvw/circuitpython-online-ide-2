import HyperLink from "../layout/HyperLink";
import WarningModal from "../layout/WarningModal";

export default function ErrorIsNotChrome() {
    return (
        <WarningModal title="Your Browser Is Not Supported!" closeEnabled={false}>
            CircuitPython Online IDE only supports Chrome, MS Edge, or other Chromium-based browsers on a Windows PC,
            Mac or Chromebook. Check out
            <HyperLink
                text="this link"
                link="https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API#browser_compatibility"
            />
            for more information
        </WarningModal>
    );
}
