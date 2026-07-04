import { useState } from "react";
import { Box, IconButton, Tooltip, ClickAwayListener } from "@mui/material";
import { NoTheme } from "react-lazy-dark-theme";
import FlipIcon from "@mui/icons-material/Flip";
import RotateRightIcon from "@mui/icons-material/RotateRight";
import RotateLeftIcon from "@mui/icons-material/RotateLeft";
import FitScreenIcon from "@mui/icons-material/FitScreen";
import EditIcon from "@mui/icons-material/Edit";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";

const ICON_COLOR = "rgba(255, 255, 255, 0.9)";
const ACTIVE_COLOR = "#4fc3f7";

function ToolButton({ title, active = false, onClick, children }) {
    return (
        <Tooltip title={title}>
            <IconButton size="small" onClick={onClick} sx={{ color: active ? ACTIVE_COLOR : ICON_COLOR }}>
                {children}
            </IconButton>
        </Tooltip>
    );
}

function GroupDivider() {
    return <Box sx={{ alignSelf: "stretch", my: "8px", width: "1px", backgroundColor: "rgba(255, 255, 255, 0.25)" }} />;
}

// Media-player-style control bar floating over the bottom of the camera view.
export default function CameraToolbar({
    onFlipH,
    onFlipV,
    onRotateCw,
    onRotateCcw,
    onResetView,
    marking,
    onToggleMarking,
    onClearMarks,
    markColor,
    markColors,
    onSelectMarkColor,
    paused,
    onTogglePause,
    onCapture,
}) {
    const [paletteOpen, setPaletteOpen] = useState(false);

    return (
        <Box
            sx={{
                position: "absolute",
                bottom: 12,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 10,
            }}
        >
            {/* NoTheme keeps the bar dark and the color swatches true under the inverted dark theme */}
            <NoTheme>
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 0.25,
                        px: 1,
                        py: 0.25,
                        borderRadius: "999px",
                        backgroundColor: "rgba(20, 20, 20, 0.75)",
                        backdropFilter: "blur(4px)",
                    }}
                >
                    <ToolButton title="Flip Horizontal" onClick={onFlipH}>
                        <FlipIcon fontSize="small" />
                    </ToolButton>
                    <ToolButton title="Flip Vertical" onClick={onFlipV}>
                        <FlipIcon fontSize="small" sx={{ transform: "rotate(90deg)" }} />
                    </ToolButton>
                    <ToolButton title="Rotate 90° Counterclockwise" onClick={onRotateCcw}>
                        <RotateLeftIcon fontSize="small" />
                    </ToolButton>
                    <ToolButton title="Rotate 90° Clockwise" onClick={onRotateCw}>
                        <RotateRightIcon fontSize="small" />
                    </ToolButton>
                    <ToolButton title="Reset Zoom and Position" onClick={onResetView}>
                        <FitScreenIcon fontSize="small" />
                    </ToolButton>

                    <GroupDivider />

                    <ToolButton title={paused ? "Resume" : "Pause"} active={paused} onClick={onTogglePause}>
                        {paused ? <PlayArrowIcon fontSize="medium" /> : <PauseIcon fontSize="medium" />}
                    </ToolButton>
                    <ToolButton title="Capture to Clipboard" onClick={onCapture}>
                        <PhotoCameraIcon fontSize="small" />
                    </ToolButton>

                    <GroupDivider />

                    <ToolButton title={marking ? "Stop Marking" : "Start Marking"} active={marking} onClick={onToggleMarking}>
                        <EditIcon fontSize="small" />
                    </ToolButton>
                    <ToolButton title="Clear Marks" onClick={onClearMarks}>
                        <DeleteSweepIcon fontSize="small" />
                    </ToolButton>

                    <ClickAwayListener onClickAway={() => setPaletteOpen(false)}>
                        <Box sx={{ position: "relative", display: "flex" }}>
                            <Tooltip title="Marker Color">
                                <IconButton size="small" onClick={() => setPaletteOpen((open) => !open)}>
                                    <Box
                                        sx={{
                                            width: 16,
                                            height: 16,
                                            borderRadius: "50%",
                                            backgroundColor: markColor,
                                            border: "2px solid rgba(255, 255, 255, 0.8)",
                                        }}
                                    />
                                </IconButton>
                            </Tooltip>
                            {paletteOpen && (
                                <Box
                                    sx={{
                                        position: "absolute",
                                        bottom: "calc(100% + 10px)",
                                        left: "50%",
                                        transform: "translateX(-50%)",
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        gap: 1,
                                        p: 1,
                                        borderRadius: "999px",
                                        backgroundColor: "rgba(20, 20, 20, 0.85)",
                                        backdropFilter: "blur(4px)",
                                    }}
                                >
                                    {markColors.map((color) => (
                                        <Box
                                            key={color.name}
                                            title={color.name}
                                            onClick={() => {
                                                onSelectMarkColor(color.value);
                                                setPaletteOpen(false);
                                            }}
                                            sx={{
                                                width: 18,
                                                height: 18,
                                                borderRadius: "50%",
                                                cursor: "pointer",
                                                backgroundColor: color.value,
                                                border:
                                                    color.value === markColor
                                                        ? "2px solid rgba(255, 255, 255, 0.9)"
                                                        : "2px solid transparent",
                                                "&:hover": { transform: "scale(1.15)" },
                                            }}
                                        />
                                    ))}
                                </Box>
                            )}
                        </Box>
                    </ClickAwayListener>
                </Box>
            </NoTheme>
        </Box>
    );
}
