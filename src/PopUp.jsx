import { useState } from "react";
import NewWindow from "react-new-window";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Button from "@mui/material/Button";

export default function PopUp({ children, title }) {
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
        <>
            <Tooltip title="Open the tab in a popup window" sx={{ position: "absolute", top: 3, right: 3, zIndex:1}}>
                <IconButton>
                    <OpenInNewIcon
                        onClick={() => {
                            setPopped(true);
                        }}
                    />
                </IconButton>
            </Tooltip>
            {children}
        </>
    );
}
