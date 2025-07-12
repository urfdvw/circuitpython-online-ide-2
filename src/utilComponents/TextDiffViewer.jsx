import React from "react";
import { diffLines } from "diff";
import { Box, Typography } from "@mui/material";

// Replace special characters with visible symbols
const formatWhitespace = (text) =>
    text
        .replace(/ /g, "⎵") // visible space
        .replace(/\t/g, "→\t") // visible tab indicator
        .replace(/\n/g, "⏎\n"); // visible newline marker

const styles = {
    added: {
        backgroundColor: "#e6ffed",
        color: "#22863a",
    },
    removed: {
        backgroundColor: "#ffeef0",
        color: "#b31d28",
    },
    unchanged: {
        backgroundColor: "inherit",
        color: "inherit",
    },
};

const TextDiffViewer = ({ oldText, newText }) => {
    const diff = diffLines(oldText, newText);

    return (
        <Box
            sx={{
                width: "100%",
            }}
        >
            {diff.map((part, index) => {
                const { added, removed, value } = part;
                const style = added ? styles.added : removed ? styles.removed : styles.unchanged;

                return (
                    <Typography
                        key={index}
                        component="pre"
                        sx={{
                            display: "block",
                            padding: "0.2rem",
                            fontFamily: "Monospace",
                            ...style,
                        }}
                    >
                        {formatWhitespace(value)}
                    </Typography>
                );
            })}
        </Box>
    );
};

export default TextDiffViewer;
