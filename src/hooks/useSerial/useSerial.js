import { useState, useEffect, useCallback } from "react";
import * as constants from "../../constants";
import SerialCommunication from "./serial";
import { sleep } from "./utils";

const serial = new SerialCommunication();

const useSerial = () => {
    const [serialReady, setSerialReady] = useState(false);
    const [serialOutput, setSerialOutput] = useState("");

    useEffect(() => {
        // check if browser compatible
        if (!navigator.serial) {
            console.error("Web Serial API not supported");
        }

        // setup callback to get full history
        serial.registerReaderCallback("dataFromMcu", (data) => {
            setSerialOutput((previousOutput) => previousOutput + data);
        });
    }, []);
    // check if port closed unexpected
    useEffect(() => {
        setSerialReady(serial.port ? serial.port.connected : false);
    }, [serial.port, serial.port && serial.port.connected]);

    const disconnectFromSerialPort = useCallback(async () => {
        await serial.close();
        setSerialReady(false);
    }, []);

    const sendDataToSerialPort = useCallback(async (data) => {
        try {
            serial.write(data);
            console.log("sent data to mcu:", [data]);
        } catch (err) {
            console.error("Failed to send data to MCU:", err);
        }
    }, []);

    const connectToSerialPort = useCallback(async (refresh) => {
        if (serialReady) {
            if (confirm("Do you want to connect to a new device?")) {
                await disconnectFromSerialPort();
            } else {
                return;
            }
        }
        try {
            const status = await serial.open();
            setSerialReady(status);
            if (status) {
                if (refresh) {
                    // break any current run (no effect/harm in repl)
                    await sendDataToSerialPort(constants.CTRL_C);
                    await sleep(500);
                    // start a fresh run (No matter from REPL or code)
                    await sendDataToSerialPort(constants.CTRL_D);
                }
            } else {
                serial.close();
            }
        } catch (err) {
            console.error("Failed to connect:", err);
        }
    }, [serialReady, disconnectFromSerialPort, sendDataToSerialPort]);

    function addToSerialOutput(text) {
        setSerialOutput((prev) => prev + text);
    }

    return {
        connectToSerialPort,
        disconnectFromSerialPort,
        sendDataToSerialPort,
        addToSerialOutput,
        serialOutput,
        serialReady,
        serial,
    };
};

export default useSerial;

/**
 * TODO
 * move Title to console, this is not the place
 * change name according to docs/terms.md
 * add callback to returns
 * change the code structure, serial and use Serial to a folder, serial console to a folder.
 */
