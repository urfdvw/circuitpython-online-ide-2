import { useState } from "react";
import NewWindow from "react-new-window";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Button from "@mui/material/Button";

export default function PopUp({ children, title, parentStyle }) {
    const [popped, setPopped] = useState(false);
    return popped ? (
        <>
            <p>This tab is opened in a popup window.</p>
            <Button
                onClick={() => {
                    setPopped(false);
                }}
                style={{
                    textTransform: "none",
                }}
                variant="contained"
            >
                Dock the window
            </Button>
            <NewWindow
                title={title}
                onUnload={() => {
                    setPopped(false);
                }}
            >
                {children}
            </NewWindow>
        </>
    ) : (
        <div style={parentStyle}>
            <Tooltip title="Open the tab in a popup window" sx={{ position: "absolute", top: 16, right: 16, zIndex: 1 }}>
                <IconButton
                    onClick={() => {
                        setPopped(true);
                    }}
                >
                    <OpenInNewIcon />
                </IconButton>
            </Tooltip>
            {children}
        </div>
    );
}
