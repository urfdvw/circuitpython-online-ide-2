import React from "react";
import { Box, Button, Tooltip, Slide } from "@mui/material";

const SiblingWithBottomRightTab = ({ children, label = "", tooltip = "", onClick = null, visible = true }) => {
    return (
        <Box position="relative" display="inline-block" sx={{
            height: "100%", width: "100%"
        }}>
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

                <Slide in={visible} timeout={500}>
                    <Tooltip title={tooltip} placement="top">
                        <Button
                            onClick={onClick}
                            variant="contained"
                            // color="primary"
                            size="small"
                            sx={{
                                opacity: 0.5,
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
                </Slide>
            </Box>
        </Box>
    );
};

export default SiblingWithBottomRightTab;
