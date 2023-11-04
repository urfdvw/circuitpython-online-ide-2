// MUI
import Box from "@mui/material/Box";
// Other packages
import ScrollableFeed from "react-scrollable-feed"; // https://stackoverflow.com/a/52673227/7037749
// Mine
import { removeInBetween } from "./textProcessor";
import * as constants from "./constants";

const rawSerialBoxStyles = {
    bgcolor: "background.paper",
    borderColor: "text.primary",
    m: 1,
    border: 1,
    padding: "10px",
    borderRadius: "16px",
    height: "100%",
};

const RawConsole = ({ output, config }) => {
    if (config.raw_console.hide_title) {
        output = removeInBetween(
            output,
            constants.TITLE_START,
            constants.TITLE_END
        );
    }

    if (config.raw_console.hide_cv) {
        output = removeInBetween(
            output,
            constants.CV_JSON_START,
            constants.CV_JSON_END
        );
    }

    return (
        <Box sx={rawSerialBoxStyles}>
            <ScrollableFeed>
                <pre style={{ whiteSpace: "pre-wrap" }}>{output}</pre>
            </ScrollableFeed>
        </Box>
    );
};

export default RawConsole;
