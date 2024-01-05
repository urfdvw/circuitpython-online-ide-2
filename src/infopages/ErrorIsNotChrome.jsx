// device detect
import { isSafari, isFirefox, isIE } from "react-device-detect";
// MUI
import Modal from "@mui/material/Modal";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";

export default function ErrorIsNotChrome() {
    const style = {
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "50%",
        height: "50%",
        bgcolor: "background.paper",
        border: "2px solid #000",
        boxShadow: 24,
        p: 4,
    };
    if (isSafari || isFirefox || isIE) {
        return (
            <Modal
                open={true}
                aria-labelledby="modal-modal-title"
                aria-describedby="modal-modal-description"
                hideBackdrop={true}
            >
                <Box sx={style}>
                    <Typography id="modal-modal-title" variant="h6" component="h2">
                        Your Browser Is Not Supported!
                    </Typography>
                    <Typography id="modal-modal-description" sx={{ mt: 2 }}>
                        CircuitPython Online IDE only supports Chrome, MS Edge, or other Chromium-based browsers on a
                        Windows PC, Mac or Chromebook. Check out
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
                </Box>
            </Modal>
        );
    }
}
