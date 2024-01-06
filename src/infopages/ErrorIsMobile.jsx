import HyperLink from "../layout/HyperLink";
import WarningModal from "../layout/WarningModal";

export default function ErrorIsMobile() {
    return (
        <WarningModal title="Mobile devices are not supported!" closeEnabled={false}>
            CircuitPython Online IDE is not supported on mobile devices. Please use Chrome, MS Edge, or other
            Chromium-based browsers on a Windows PC, Mac or Chromebook. Check out
            <HyperLink
                text="this link"
                link="https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API#browser_compatibility"
            />
            for more information
        </WarningModal>
    );
}
