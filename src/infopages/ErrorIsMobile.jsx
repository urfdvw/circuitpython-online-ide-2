// MUI
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
export default function ErrorIsMobile() {
    return (
        <>
            <Typography variant="h4" component="h2">
                Mobile devices are not supported!
            </Typography>
            <Typography variant="h6" component="body">
                CircuitPython Online IDE is not supported on mobile devices. Please use Chrome, MS Edge, or other
                Chromium-based browsers on a Windows PC, Mac or Chromebook. Check out
                <Button
                    onClick={() => {
                        window.open(
                            "https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API#browser_compatibility",
                            "_blank"
                        );
                    }}
                >
                    this link
                </Button>
                for more information
            </Typography>
        </>
    );
}
