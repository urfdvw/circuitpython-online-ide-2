import { useState } from "react";
import PopUp from "../utilComponents/PopUp";
import Button from "@mui/material/Button";

export default function Projector() {
    const [popped, setPopped] = useState(false);
    return (
        <PopUp
            popped={popped}
            setPopped={setPopped}
            altChildren={
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
                </>
            }
        >
            <Button
                onClick={() => {
                    setPopped(true);
                }}
                style={{
                    textTransform: "none",
                }}
                variant="contained"
            >
                Popup the window
            </Button>
            <p>Bible should display here</p>
        </PopUp>
    );
}
