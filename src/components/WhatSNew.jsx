import { useState, useEffect, useContext } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, useTheme } from "@mui/material";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import MarkdownExtended from "../utilComponents/MarkdownExtended";
import version_history from "../docs/Version history.md";
import AppContext from "../AppContext";

const version_config = "whats_new_2_5_0"; // need to match the name in the config

// Version-history sections, one per "## " header, newest first. The source is a
// static import, so this is computed once at module load.
const sections = version_history
    .trim()
    .split(/\n(?=## )/g)
    .filter((section) => section.trim() !== "");

// "What's New" dialog: opens once per release (tracked by a config flag) and
// lets the user page through version-history sections.
const WhatSNew = () => {
    const { appConfig } = useContext(AppContext);
    const theme = useTheme();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [open, setOpen] = useState(false);

    const showOnStartup = appConfig.config.general[version_config];
    useEffect(() => {
        setOpen(showOnStartup);
    }, [showOnStartup]);

    // Reset to the latest version whenever the modal opens
    useEffect(() => {
        if (open && sections.length > 0) {
            setCurrentIndex(0);
        }
    }, [open]);

    // Not shown when running from a local file, or when there is nothing to show.
    if (window.location.protocol === "file:" || sections.length === 0) {
        return null;
    }

    function gotItHandler() {
        setOpen(false);
        appConfig.setConfigField("general", version_config, false);
    }

    const showNewer = () => {
        if (currentIndex > 0) {
            setCurrentIndex((prev) => prev - 1);
        }
    };

    const showOlder = () => {
        if (currentIndex < sections.length - 1) {
            setCurrentIndex((prev) => prev + 1);
        }
    };

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
                    What&apos;s New!
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
                <MarkdownExtended>{sections[currentIndex]}</MarkdownExtended>
            </DialogContent>

            <DialogActions sx={{ justifyContent: "space-between", px: 3, py: 2 }}>
                <Box>
                    <Button
                        size="small"
                        startIcon={<NavigateBeforeIcon />}
                        onClick={showNewer}
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
                        onClick={showOlder}
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
