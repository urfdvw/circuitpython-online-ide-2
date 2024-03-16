import NewWindow from "react-new-window";
import Button from "@mui/material/Button";

export default function PopUp({ children, popped, setPopped, title, parentStyle }) {
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
        <div style={parentStyle}>{children}</div>
    );
}
