// React
import { useState } from "react";
// MUI
import Modal from "@mui/material/Modal";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";

export default function WarningIsMac() {
    const [open, setOpen] = useState(true);
    const handleClose = () => setOpen(false);

    const style = {
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: 400,
        bgcolor: "background.paper",
        border: "2px solid #000",
        boxShadow: 24,
        p: 4,
    };
    return (
        <Modal
            open={open}
            onClose={handleClose}
            aria-labelledby="modal-modal-title"
            aria-describedby="modal-modal-description"
        >
            <Box sx={style}>
                <Typography id="modal-modal-title" variant="h6" component="h2">
                    Warning for MacOS users!
                </Typography>
                <Typography id="modal-modal-description" sx={{ mt: 2 }}>
                    If you have issues writing files to microcontrollers, it is not a bug of the IDE or CircuitPython,
                    but a known issue of MacOS 14 (Sonoma). Please check
                    <Button
                        onClick={() => {
                            window.open(
                                "https://github.com/adafruit/circuitpython/issues/8449#issuecomment-1743922060",
                                "_blank"
                            );
                        }}
                    >
                        this link
                    </Button>
                    for a walkaround that temporary fix this issue.
                </Typography>
            </Box>
        </Modal>
    );
}
