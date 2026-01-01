import { useState } from "react";
import * as constants from "../../constants";
import { removeCommonIndentation, sleep } from "./utils";

export default function useSerialCommands(sendDataToSerialPort, serialOutput, serialReady) {
    const [codeHistory, setCodeHistory] = useState(['print("Hello CircuitPython!")']);

    function addCodeHistory(code) {
        setCodeHistory((curCodeHistory) => {
            const newHistory = [...curCodeHistory.filter((historyCode) => historyCode != code), code];
            return newHistory;
        });
    }

    async function sendCtrlC() {
        if (!serialReady) {
            return;
        }
        console.log("sending Ctrl-C to serial port");
        await sendDataToSerialPort(constants.CTRL_C);
    }

    async function sendCtrlD() {
        if (!serialReady) {
            return;
        }
        console.log("sending Ctrl-D to serial port");
        await sendDataToSerialPort(constants.CTRL_D);
    }

    async function sendSingleLineText(text) {
        if (!serialReady) {
            return;
        }
        text = text.trim();
        console.log("sending text serial port: " + text);
        await sendDataToSerialPort(text + constants.LINE_END);
    }

    async function sendMultiLineCode(code) {
        if (!serialReady) {
            return;
        }
        code = removeCommonIndentation(code);
        // dealing with linebreaks and '\n' in text
        code = code.split("\\").join("\\\\").split("\n").join("\\n");
        // remove comments by """
        code = code.split('"""');
        for (let i = 0; i < code.length; i++) {
            code.splice(i + 1, 1);
        }
        code = code.join("");
        // send commands to device
        await sendSingleLineText('exec("""' + code + '""")');
    }

    async function sendCode(code, force) {
        if (!serialReady) {
            return;
        }
        addCodeHistory(code);
        code = code.split("\r").join("");
        if (!force) {
            if (serialOutput.slice(-4, -1) !== ">>>") {
                confirm("Before sending Python code to the serial console, make sure to start RELP first.");
                return;
            }
        }
        if (code.split("\n").length > 1) {
            await sendMultiLineCode(code);
        } else {
            await sendSingleLineText(code);
        }
    }

    return { sendCtrlC, sendCtrlD, sendCode, codeHistory };
}
