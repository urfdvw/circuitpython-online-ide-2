// React
import { useState, useContext } from "react";
// context
import AppContext from "../AppContext";
// MUI
import { Box, Button } from "@mui/material";
// util: download log
import { downloadAsFile } from "../utilComponents/react-local-file-system";
// tab template
import TabTemplate from "../utilComponents/TabTemplate";
// Xterm + raw log (shared, parameterized components)
import XtermConsole from "./XtermConsole";
import RawConsoleLog from "./RawConsoleLog";
// layout
import { openTab } from "../layout/layoutUtils";

/**
 * Display-only console for the Connected-Variables data channel (CircuitPython usb_cdc.data).
 * Unlike the REPL Serial Console it never sends typed input to the board. Keeps the familiar
 * connect / clear / raw log / download log features.
 */
const DataSerialConsole = () => {
    const {
        dataSerial,
        dataSerialOutput,
        dataSerialReady,
        connectToDataSerialPort,
        flexModel,
    } = useContext(AppContext);
    const [clearTrigger, setClearTrigger] = useState(0);

    const menuStructure = [
        {
            label: "≡",
            options: [
                {
                    text: "Connect to Data Serial Port",
                    handler: () => connectToDataSerialPort(),
                },
                {
                    // clears the terminal view only (raw log keeps the full history, like the REPL console)
                    text: "Clear",
                    handler: () => setClearTrigger((prev) => prev + 1),
                },
                {
                    text: "Raw Log",
                    handler: () => openTab(flexModel, "Data Serial Raw Log", "data_serial_raw_log"),
                },
                {
                    text: "Download Log",
                    handler: () => downloadAsFile("data serial log.txt", dataSerialOutput),
                },
            ],
        },
    ];

    return dataSerialOutput.length > 0 ? (
        <TabTemplate title={dataSerialReady ? "Data Serial" : "Not Connected"} menuStructure={menuStructure}>
            <Box sx={{ display: "flex", flexDirection: "column", height: "100%", overflowX: "hidden" }}>
                <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto" }}>
                    <XtermConsole
                        clearTrigger={clearTrigger}
                        serialInstance={dataSerial}
                        serialOutput={dataSerialOutput}
                        readerId="dataTerminal"
                        enableInput={false}
                    />
                </Box>
            </Box>
        </TabTemplate>
    ) : (
        <Button onClick={() => connectToDataSerialPort()}>Connect to Data Serial Port</Button>
    );
};

export default DataSerialConsole;

// Raw log for the data channel — small wrapper so the FlexLayout factory can render it without
// needing to pull dataSerialOutput from context itself.
export function DataSerialRawLog() {
    const { dataSerialOutput } = useContext(AppContext);
    return <RawConsoleLog log={dataSerialOutput} />;
}
