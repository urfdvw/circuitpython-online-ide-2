import { useState } from "react";
import "./App.css";
import Ide from "./Ide";
import { isMobile } from "react-device-detect";
import ErrorIsMoble from "./ErrorIsMoble";
import Menu from "./Menu";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import { deepPurple } from "@mui/material/colors";
// submodule
import useFileSystem from "../useFileSystem/src/useFileSystem";

function App() {
    const {
        openDirectory,
        selectedHandle,
        directoryReady,
        readFile,
        readDir,
        writeFile,
    } = useFileSystem();

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
                    <Menu
                        lable="Connect"
                        options={[
                            {
                                text: "CircuitPy Drive",
                                handler: () => {
                                    console.log("clicked on CircuitPy");
                                },
                            },
                            {
                                text: "Serial",
                                handler: () => {
                                    console.log("clicked on Serial");
                                },
                            },
                        ]}
                    />
                    <Menu
                        lable="Open"
                        options={[
                            {
                                text: "Settings",
                                handler: () => {
                                    console.log("clicked on Settings");
                                },
                            },
                            {
                                text: "Folder View",
                                handler: () => {
                                    console.log("clicked on Folder View");
                                },
                            },
                        ]}
                    />
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
