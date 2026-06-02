import { useCallback } from "react";
import * as constants from "../../constants";
import { sleep } from "./utils";
import createSerialChannel from "./useSerialChannel";

// REPL serial channel (the Python console). Built on the shared, reusable channel factory.
const useReplChannel = createSerialChannel({ readerId: "dataFromMcu" });

const useSerial = () => {
    const channel = useReplChannel();

    // REPL-specific connect: optionally "refresh" the board after connecting by sending
    // Ctrl-C (break any current run) then Ctrl-D (start a fresh run). This is the only
    // REPL-specific behaviour layered on top of the generic channel.
    const connectToSerialPort = useCallback(
        async (refresh) => {
            const status = await channel.connect();
            if (status && refresh) {
                await channel.send(constants.CTRL_C);
                await sleep(500);
                await channel.send(constants.CTRL_D);
            }
            return status;
        },
        [channel.connect, channel.send]
    );

    // keep the exact same field names so App.jsx and all existing consumers are unchanged
    return {
        connectToSerialPort,
        disconnectFromSerialPort: channel.disconnect,
        sendDataToSerialPort: channel.send,
        addToSerialOutput: channel.addToOutput,
        serialOutput: channel.output,
        serialReady: channel.ready,
        serial: channel.serial,
    };
};

export default useSerial;
