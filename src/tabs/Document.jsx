import Box from "@mui/material/Box";
import MarkdownExtended from "../layout/MarkdownExtended";

export default function Document({ info }) {
    return (
        <Box sx={{ margin: "20pt" }}>
            <MarkdownExtended>{info}</MarkdownExtended>
        </Box>
    );
}
