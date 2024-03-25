// React
import { useState } from "react";
// MUI
import Modal from "@mui/material/Modal";
import Box from "@mui/material/Box";

export default function WarningModal({ children, closeEnabled }) {
    const [open, setOpen] = useState(true);
    const handleClose = closeEnabled ? () => setOpen(false) : () => {};

    const style = {
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "calc(min(100% - 100px, 500px))",
        bgcolor: "background.paper",
        border: "2px solid #000",
        boxShadow: 24,
        p: 4,
    };
    return (
        <Modal open={open} onClose={handleClose}>
            <Box sx={style}>{children}</Box>
        </Modal>
    );
}
