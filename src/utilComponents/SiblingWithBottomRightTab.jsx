import React from "react";
import { Box, Button, Tooltip } from "@mui/material";

const SiblingWithBottomRightTab = ({ children, label = "", tooltip = "", onClick = null }) => {
    return (
        <Box position="relative" display="inline-block">
            {/* Main sibling component */}
            {children}

            {/* Tab-like Button as a sibling, overlaid on bottom-right */}
            <Box
                sx={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                }}
            >
                <Tooltip title={tooltip}>
                    <Button
                        onClick={onClick}
                        variant="contained"
                        color="primary"
                        size="small"
                        sx={{
                            opacity: 0.4,
                            transition: "opacity 0.3s ease",
                            "&:hover": {
                                opacity: 1,
                            },
                            "&:focus": {
                                opacity: 1,
                            },
                            borderTopLeftRadius: 12,
                            borderBottomRightRadius: 0,
                            borderTopRightRadius: 0,
                            borderBottomLeftRadius: 0,
                            textTransform: "none",
                            minWidth: "10px",
                        }}
                    >
                        {label}
                    </Button>
                </Tooltip>
            </Box>
        </Box>
    );
};

export default SiblingWithBottomRightTab;
