import React from "react";
import {
    AppBar,
    Toolbar,
    Typography,
    Button,
    Box,
    Container,
    Grid,
    Card,
    CardContent,
    CardMedia,
    Divider,
    Link,
    CssBaseline,
} from "@mui/material";
import { isMobile } from "react-device-detect";

// --- Content Data (Original Text) ---

const FEATURES = [
    {
        heading: "Folder View",
        body: "Manage file on your microcontroller",
        image: "https://urfdvw.github.io/circuitpython-online-ide-2/media/folder_view.png",
    },
    {
        heading: "Code Editor",
        body: "Python highlighting and Multi-tab support",
        image: "https://urfdvw.github.io/circuitpython-online-ide-2/media/editor.png",
    },
    {
        heading: "Serial Console",
        body: "For communication and REPL",
        image: "https://urfdvw.github.io/circuitpython-online-ide-2/media/serial_console.png",
    },
    {
        heading: "Plotter",
        body: "Visualize sensor data",
        image: "https://urfdvw.github.io/circuitpython-online-ide-2/media/plotter.png",
    },
    {
        heading: "Library Management",
        body: "Automated dependency handling with manual control options",
        image: "https://urfdvw.github.io/circuitpython-online-ide-2/media/library_management.png",
    },
    {
        heading: "Camera",
        body: "Show your microcontroller to others",
        image: "https://urfdvw.github.io/circuitpython-online-ide-2/media/camera.png",
    },
];

// --- Styles & Theme Constants ---

const COLORS = {
    background: "linear-gradient(180deg, #FFFFFF 0%, #FAF8FC 100%)",
    title: "#311b92",
    accentBorder: "#ede7f6",
    buttonBg: "#4a148c",
    textSecondary: "#5f6368",
};

const video_css = {
    width: "100%",
    height: "100%",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
};

const ProductPage = () => {
    React.useEffect(() => {
        document.body.style.overflow = "auto";
    }, []);

    return (
        <Box
            sx={{
                minHeight: "100vh",
                background: COLORS.background,
                color: "#333",
            }}
        >
            <CssBaseline />

            {/* --- Top Bar --- */}
            <AppBar
                position="sticky"
                elevation={0}
                sx={{
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    borderBottom: `1px solid ${COLORS.accentBorder}`,
                    backdropFilter: "blur(8px)",
                }}
            >
                <Toolbar sx={{ justifyContent: "space-between" }}>
                    <Typography variant="h6" component="div" sx={{ color: COLORS.title, fontWeight: 700 }}>
                        CircuitPython Online IDE
                    </Typography>

                    {/* Button hidden strictly on mobile devices via react-device-detect */}
                    {!isMobile && (
                        <Button
                            variant="contained"
                            sx={{
                                backgroundColor: COLORS.buttonBg,
                                borderRadius: "8px",
                                textTransform: "none",
                                "&:hover": { backgroundColor: "#311b92" },
                            }}
                            onClick={() => window.open("https://urfdvw.github.io/circuitpython-online-ide-2", "_self")}
                        >
                            Open IDE
                        </Button>
                    )}
                </Toolbar>
            </AppBar>

            <Container maxWidth="lg">
                {/* --- Main Stage --- */}
                <Box component="section" sx={{ py: { xs: 4, md: 10 } }}>
                    <Grid container spacing={6} alignItems="center">
                        <Grid item xs={12} md={7}>
                            <Box
                                component="img"
                                src="https://urfdvw.github.io/circuitpython-online-ide-2/media/main.png"
                                alt="CircuitPython Online IDE"
                                sx={{
                                    width: "100%",
                                    height: "auto",
                                    borderRadius: "12px",
                                    boxShadow: "0 10px 30px rgba(49, 27, 146, 0.08)",
                                    border: `1px solid ${COLORS.accentBorder}`,
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} md={5}>
                            <Typography
                                variant="h3"
                                component="h1"
                                gutterBottom
                                sx={{ color: COLORS.title, fontWeight: 700 }}
                            >
                                CircuitPython Online IDE
                            </Typography>
                            <Typography
                                variant="h6"
                                sx={{ color: COLORS.textSecondary, fontWeight: 400, lineHeight: 1.6 }}
                            >
                                A powerful browser-based IDE for CircuitPython microcontrollers.
                            </Typography>
                        </Grid>
                    </Grid>
                </Box>

                <Divider sx={{ borderColor: COLORS.accentBorder }} />

                {isMobile && (
                    <Typography variant="h7" sx={{ color: COLORS.textSecondary, fontWeight: 400, lineHeight: 1.6 }}>
                        <i>
                            To use the IDE, visit <b>circuitpy.dev</b> on a desktop browser.
                        </i>
                    </Typography>
                )}

                {/* --- Feature Section --- */}
                <Box component="section" sx={{ py: { xs: 6, md: 8 } }}>
                    {/* Modification: "Features" Title Removed */}
                    <Grid container spacing={4}>
                        {FEATURES.map((feature, index) => (
                            <Grid item xs={12} md={4} key={index}>
                                <Card
                                    variant="outlined"
                                    sx={{
                                        height: "100%",
                                        display: "flex",
                                        flexDirection: "column",
                                        borderRadius: "12px",
                                        border: `1px solid ${COLORS.accentBorder}`,
                                        transition: "transform 0.2s",
                                        "&:hover": { transform: "translateY(-4px)" },
                                    }}
                                >
                                    <CardMedia
                                        component="img"
                                        height="250"
                                        image={feature.image}
                                        alt={feature.heading}
                                        sx={{ backgroundColor: "#ffffff", objectFit: "contain" }}
                                    />
                                    <CardContent>
                                        <Typography
                                            gutterBottom
                                            variant="h6"
                                            component="div"
                                            sx={{ color: COLORS.title, fontWeight: 600 }}
                                        >
                                            {feature.heading}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {feature.body}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Box>

                <Divider sx={{ borderColor: COLORS.accentBorder }} />

                {/* --- Quick Start Section --- */}
                <Box component="section" sx={{ py: { xs: 6, md: 10 } }}>
                    <Grid container spacing={6} alignItems="center">
                        {/* Video Item */}
                        {/* Modification: Order 2 on mobile (bottom), Order 1 on desktop (left) */}
                        <Grid item xs={12} md={7} sx={{ order: { xs: 2, md: 1 } }}>
                            <Box
                                sx={{
                                    position: "relative",
                                    paddingBottom: "56.25%", // 16:9 Aspect Ratio
                                    height: 0,
                                    overflow: "hidden",
                                    borderRadius: "12px",
                                }}
                            >
                                <Box sx={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}>
                                    <iframe
                                        style={video_css}
                                        src="https://www.youtube.com/embed/kq554m21G4A?si=xLRUJNfd6tvAqGuH&cc_load_policy=1&cc_lang_pref=en"
                                        title="Quick Start Guide"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                        referrerPolicy="strict-origin-when-cross-origin"
                                        allowFullScreen
                                    ></iframe>
                                </Box>
                            </Box>
                        </Grid>

                        {/* Title Item */}
                        {/* Modification: Order 1 on mobile (top), Order 2 on desktop (right) */}
                        <Grid item xs={12} md={5} sx={{ order: { xs: 1, md: 2 }, mb: { xs: 2, md: 0 } }}>
                            <Typography variant="h4" component="h2" sx={{ color: COLORS.title, fontWeight: 600 }}>
                                Quick Start Guide
                            </Typography>
                        </Grid>
                    </Grid>
                </Box>

                <Divider sx={{ borderColor: COLORS.accentBorder }} />

                {/* --- Footer --- */}
                <Box component="footer" sx={{ py: 6 }}>
                    <Grid container spacing={4}>
                        <Grid item xs={12} md={4}>
                            <Typography variant="h6" gutterBottom sx={{ color: COLORS.title, fontWeight: 600 }}>
                                About
                            </Typography>
                            {/* Modification: Version number removed */}
                            <Typography variant="body2" paragraph sx={{ color: COLORS.textSecondary }}>
                                <Link
                                    href="https://circuitpython.org/"
                                    target="_blank"
                                    color="inherit"
                                    underline="hover"
                                >
                                    CircuitPython
                                </Link>{" "}
                                is a version of Python that runs on microcontrollers and single-board computers. Its
                                development is sponsored by{" "}
                                <Link
                                    href="https://www.adafruit.com/"
                                    target="_blank"
                                    color="inherit"
                                    underline="hover"
                                >
                                    Adafruit
                                </Link>
                                .
                            </Typography>
                            <Typography variant="body2" sx={{ color: COLORS.textSecondary }}>
                                The <strong>CircuitPython Online IDE</strong> is an open-source project published on
                                GitHub Pages under the GPL 3 license. Developed and maintained by{" "}
                                <Link
                                    href="https://github.com/urfdvw"
                                    target="_blank"
                                    color="inherit"
                                    underline="hover"
                                >
                                    River Wang
                                </Link>
                                .
                            </Typography>
                        </Grid>

                        <Grid item xs={12} md={4}>
                            <Typography variant="h6" gutterBottom sx={{ color: COLORS.title, fontWeight: 600 }}>
                                Contact Me
                            </Typography>
                            <Typography variant="body2" paragraph sx={{ color: COLORS.textSecondary }}>
                                For IDE feedback, please check{" "}
                                <Link
                                    href="https://docs.google.com/forms/d/e/1FAIpQLSdupiJIRViFwPpuQC1hMp8gRvhxACLoAjgepm_-IRZumwK7Cg/viewform"
                                    target="_blank"
                                    color="secondary"
                                    underline="hover"
                                >
                                    this survey
                                </Link>
                                .
                            </Typography>
                            <Typography variant="body2" sx={{ color: COLORS.textSecondary }}>
                                For other communications, please send an email to: <br />
                                <Box component="span" sx={{ color: COLORS.title, fontWeight: 500 }}>
                                    urfdvw@gmail.com
                                </Box>
                            </Typography>
                        </Grid>

                        <Grid item xs={12} md={4}>
                            <Typography variant="h6" gutterBottom sx={{ color: COLORS.title, fontWeight: 600 }}>
                                Connect
                            </Typography>
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                                <Link
                                    href="https://twitter.com/River___Wang"
                                    target="_blank"
                                    color="inherit"
                                    underline="hover"
                                    sx={{ display: "block", color: COLORS.textSecondary }}
                                >
                                    Twitter: @River___Wang
                                </Link>
                                <Link
                                    href="https://www.youtube.com/channel/UCeunCRTBkjHWynMl4I4le_A"
                                    target="_blank"
                                    color="inherit"
                                    underline="hover"
                                    sx={{ display: "block", color: COLORS.textSecondary }}
                                >
                                    YouTube: @Riverwang
                                </Link>
                                <Link
                                    href="https://fosstodon.org/@Riverwang"
                                    target="_blank"
                                    color="inherit"
                                    underline="hover"
                                    sx={{ display: "block", color: COLORS.textSecondary }}
                                >
                                    Mastodon: @Riverwang@fosstodon.org
                                </Link>
                            </Box>
                        </Grid>
                    </Grid>

                    <Box sx={{ mt: 4, textAlign: "center" }}>
                        <Typography variant="caption" color="text.secondary">
                            {new Date().getFullYear()} CircuitPython Online IDE.
                        </Typography>
                    </Box>
                </Box>
            </Container>
        </Box>
    );
};

export default ProductPage;
