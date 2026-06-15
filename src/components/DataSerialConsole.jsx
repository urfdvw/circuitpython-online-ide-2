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
import { openTab, selectTabById } from "../layout/layoutUtils";

/**
 * Console for the data serial channel (CircuitPython usb_cdc.data or a separate USB serial
 * device). Shows everything received on the channel and sends typed keystrokes back to it.
 * Keeps the familiar connect / clear / raw log / download log features.
 */
const DataSerialConsole = () => {
    const {
        dataSerial,
        dataSerialOutput,
        dataSerialReady,
        connectToDataSerialPort,
        sendToDataSerialPort,
        flexModel,
        helpTabSelection,
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
                {
                    text: "Help",
                    handler: () => {
                        selectTabById(flexModel, "help_tab");
                        helpTabSelection.setTabName("data_serial");
                    },
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
                        sendData={sendToDataSerialPort}
                        readerId="dataTerminal"
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
