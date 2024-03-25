import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import MarkdownExtended from "../layout/MarkdownExtended";

export default function Document({ info }) {
    return (
        <Box>
            <Typography id="modal-modal-description" sx={{ mt: 2, margin: "20pt" }}>
                <MarkdownExtended>{info}</MarkdownExtended>
            </Typography>
        </Box>
    );
}
