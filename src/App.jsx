import { useState } from "react";
import "./App.css";
import Ide from "./Ide";
import { isMobile } from "react-device-detect";
import ErrorIsMoble from "./ErrorIsMoble";
import Menu from "./Menu";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import { deepPurple } from "@mui/material/colors";

function App() {
    if (isMobile) {
        return <ErrorIsMoble></ErrorIsMoble>;
    }

    return (
        <div className="ide">
            <div className="ide-header">
                <Stack direction="row" spacing={0}>
                    <Button
                        disabled
                        style={{
                            textTransform: "none",
                            color: deepPurple[500],
                        }}
                    >
                        CircuitPython Online IDE
                    </Button>
                    <Menu />
                </Stack>
            </div>
            <div className="ide-body">
                <Ide />
            </div>
            <div className="ide-tail">tail</div>
        </div>
    );
}

export default App;
