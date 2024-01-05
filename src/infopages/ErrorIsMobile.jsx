// MUI
import Typography from "@mui/material/Typography";
import HyperLink from "../layout/HyperLink";
export default function ErrorIsMobile() {
    return (
        <>
            <Typography variant="h4" component="h2">
                Mobile devices are not supported!
            </Typography>
            <Typography variant="h6" component="body">
                CircuitPython Online IDE is not supported on mobile devices. Please use Chrome, MS Edge, or other
                Chromium-based browsers on a Windows PC, Mac or Chromebook. Check out
                <HyperLink
                    text="this link"
                    link="https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API#browser_compatibility"
                />
                for more information
            </Typography>
        </>
    );
}
