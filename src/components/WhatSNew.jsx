import React, { useState, useEffect, useContext } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, useTheme } from "@mui/material";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import MarkdownExtended from "../utilComponents/MarkdownExtended";
import version_history from "../docs/Version history.md";
import AppContext from "../AppContext";

// Assuming MarkdownExtended is imported or available in your scope
// import MarkdownExtended from './MarkdownExtended';

const version_config = "whats_new_2_4_0"; // need to match the name in the config

const WhatSNew = () => {
    const { appConfig } = useContext(AppContext);
    const text = version_history;
    const theme = useTheme();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        setOpen(appConfig.config.general[version_config]);
    }, [appConfig.config.general[version_config]]);

    if (window.location.protocol === "file:") {
        return null;
    }

    function gotItHandler() {
        setOpen(false);
        appConfig.setConfigField("general", version_config, false);
    }

    // Return null if no text is provided
    if (!text || text.trim() === "") {
        return null;
    }

    // Parse sections: split by ## headers while keeping the header in the section
    // Filter out any empty strings that might result from the split at the very start
    const sections = text
        .trim()
        .split(/\n(?=## )/g)
        .filter((section) => section.trim() !== "");

    // Reset to the latest version whenever the modal opens
    useEffect(() => {
        if (open && sections.length > 0) {
            setCurrentIndex(0);
        }
    }, [open, sections.length]);

    const handleNext = () => {
        if (currentIndex > 0) {
            setCurrentIndex((prev) => prev - 1);
        }
    };

    const handleLast = () => {
        if (currentIndex < sections.length - 1) {
            setCurrentIndex((prev) => prev + 1);
        }
    };

    // Safety check in case parsing resulted in no valid sections
    if (sections.length === 0) {
        return null;
    }

    return (
        <Dialog
            open={open}
            maxWidth="sm"
            fullWidth
            aria-labelledby="whats-new-dialog-title"
            PaperProps={{
                sx: { borderRadius: 3 }, // Soften the corners of the modal itself
            }}
        >
            {/* Lively Title Section */}
            <DialogTitle
                id="whats-new-dialog-title"
                sx={{
                    pb: 2,
                    pt: 3,
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                }}
            >
                {/* A celebratory icon */}
                <Typography
                    variant="h5"
                    fontWeight="800" // Extra bold
                    sx={{
                        // Use primary color for vibrance
                        color: theme.palette.primary.main,
                        // Optional: A subtle text shadow makes it pop slightly
                        textShadow: "0px 1px 2px rgba(0,0,0,0.1)",
                    }}
                >
                    What's New!
                </Typography>
            </DialogTitle>

            {/* Fixed height and scrollable content area */}
            <DialogContent
                dividers
                sx={{
                    height: "350px", // FIXED HEIGHT defined here
                    p: 4, // More padding for readability
                    // The default behavior of DialogContent is overflow-y: auto,
                    // so it will scroll automatically if content exceeds height.
                }}
            >
                {/* Ensure the component exists before rendering */}
                {typeof MarkdownExtended !== "undefined" ? (
                    <MarkdownExtended>{sections[currentIndex]}</MarkdownExtended>
                ) : (
                    // Fallback just in case the component isn't provided in context
                    <Typography color="error">MarkdownExtended component missing.</Typography>
                )}
            </DialogContent>

            <DialogActions sx={{ justifyContent: "space-between", px: 3, py: 2 }}>
                <Box>
                    <Button
                        size="small"
                        startIcon={<NavigateBeforeIcon />}
                        onClick={handleNext}
                        disabled={currentIndex === 0}
                        sx={{ textTransform: "none", fontWeight: "bold" }}
                    >
                        Newer
                    </Button>
                </Box>

                <Button
                    variant="contained"
                    onClick={gotItHandler}
                    disableElevation
                    size="large"
                    sx={{
                        borderRadius: 8,
                        px: 4,
                        fontWeight: "bold",
                        fontSize: "1rem",
                        textTransform: "none",
                    }}
                >
                    I got it!
                </Button>

                <Box>
                    <Button
                        size="small"
                        endIcon={<NavigateNextIcon />}
                        onClick={handleLast}
                        disabled={currentIndex === sections.length - 1}
                        sx={{ textTransform: "none", fontWeight: "bold" }}
                    >
                        Older
                    </Button>
                </Box>
            </DialogActions>
        </Dialog>
    );
};

export default WhatSNew;
