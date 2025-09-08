import * as React from "react";
import { Box, Divider, Typography, Button } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";

export default function RowItem({ title, description, status = 1, button }) {
    const theme = useTheme();
    const LEFT_WIDTH = 48;

    const icon =
        status === 0 ? (
            <CloseIcon fontSize="medium" sx={{ color: theme.palette.error.main }} />
        ) : status === 0.5 ? (
            <CheckCircleIcon fontSize="medium" sx={{ color: theme.palette.warning.main }} />
        ) : (
            <CheckCircleIcon fontSize="medium" sx={{ color: theme.palette.success.main }} />
        );

    return (
        <Box
            sx={{
                width: "100%",
                display: "flex",
                alignItems: "stretch",
            }}
        >
            {/* Left (fixed) */}
            <Box
                sx={{
                    flex: `0 0 ${LEFT_WIDTH}px`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                {icon}
            </Box>

            {/* Middle (expand to max) */}
            <Box
                sx={{
                    flexGrow: 1,
                    overflow: "auto",
                    minWidth: 0, // enable ellipsis
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                <Typography variant="subtitle1" noWrap title={title}>
                    {title}
                </Typography>
                {description ? (
                    <Typography variant="body2" color="text.secondary" noWrap title={description}>
                        {description}
                    </Typography>
                ) : null}
            </Box>

            {/* Right (shrink-to-content, but *can* shrink) */}
            <Box
                sx={{
                    flexGrow: 0,
                    display: "flex",
                    minWidth: 0, // cooperate with container shrinking
                    overflow: "hidden", // prevents overflow when super narrow
                }}
            >
                {/* optional: keep button on one line without overflow */}
                <Box sx={{ display: "inline-flex", whiteSpace: "nowrap", minWidth: 0 }}>{button}</Box>
            </Box>
        </Box>
    );
}
