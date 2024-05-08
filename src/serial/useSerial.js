import { useState, useEffect } from "react";
import * as constants from "../constants";
import { matchesInBetween } from "./textProcessor";
import SerialCommunication from "./serial";

const serial = new SerialCommunication();

const useSerial = () => {
    const [serialReady, setSerialReady] = useState(false);
    const [fullSerialHistory, setFullSerialHistory] = useState("");
    const [serialOutput, setSerialOutput] = useState("");
    const [serialTitle, setSerialTitle] = useState("");

    useEffect(() => {
        if (!navigator.serial) {
            console.warn("Web Serial API not supported");
        }

        serial.registerReaderCallback("dataFromMcu", (data) => {
            setSerialOutput((previousOutput) => previousOutput + data);
        });
    }, []);

    useEffect(() => {
        setSerialTitle(matchesInBetween(serialOutput, constants.TITLE_START, constants.TITLE_END).at(-1));
    }, [serialOutput]);

    const connectToSerialPort = async () => {
        try {
            const status = await serial.open();
            setSerialReady(status);
            if (status) {
                /**
                 * This effect has two benefits
                 * * There will not be any "half blocks" when staring the IDE
                 * * Behavior of CPY each time when IDE starts are consistent
                 * Please ignore whatever is before the first `soft reboot` text
                 */
                // break any current run (no effect/harm in repl)
                await sendDataToSerialPort(constants.CTRL_C);
                // start a fresh run (No matter from REPL or code)
                await sendDataToSerialPort(constants.CTRL_D);
            } else {
                serial.close();
            }
        } catch (err) {
            console.error("Failed to connect:", err);
        }
    };

    const disconnectFromSerialPort = async function () {
        await serial.close();
    };

    const sendDataToSerialPort = async (data) => {
        if (!serialReady) {
            return;
        }

        serial.write(data);
    };

    function clearSerialOutput() {
        setFullSerialHistory((hist) => {
            return hist + serialOutput;
        });
        setSerialOutput("");
    }

    return {
        connectToSerialPort,
        disconnectFromSerialPort,
        sendDataToSerialPort,
        clearSerialOutput,
        serialOutput,
        fullSerialHistory,
        serialReady,
        serialTitle,
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
