import { useContext, useState } from "react";
import ideContext from "../ideContext";
import * as constants from "./constants";

// https://sentry.io/answers/what-is-the-javascript-version-of-sleep/
const sleep = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

export default function useSerialCommands() {
    const { config, sendDataToSerialPort: send, serialOutput: output, serialReady: ready } = useContext(ideContext);
    const [codeHistory, setCodeHistory] = useState(['print("Hello CircuitPython!")']);

    function addCodeHistory(code) {
        setCodeHistory((curCodeHistory) => {
            const newHistory = [...curCodeHistory.filter((historyCode) => historyCode != code), code];
            console.log(newHistory);
            return newHistory;
        });
    }

    async function sendCtrlC() {
        if (!ready) {
            return;
        }
        console.log("sending Ctrl-C to serial port");
        await send(constants.CTRL_C);
    }

    async function sendCtrlD() {
        if (!ready) {
            return;
        }
        console.log("sending Ctrl-D to serial port");
        await send(constants.CTRL_D);
    }

    async function sendSingleLineText(text) {
        if (!ready) {
            return;
        }
        console.log("sending text serial port: " + text);
        await send(text + constants.LINE_END);
    }

    async function sendMultiLineCode(code) {
        if (!ready) {
            return;
        }
        // dealing with linebreaks and '\n' in text
        let lines = code.split("\\").join("\\\\").split("\n").join("\\n");
        // remove comments by """
        lines = lines.split('"""');
        for (let i = 0; i < lines.length; i++) {
            lines.splice(i + 1, 1);
        }
        lines = lines.join("");
        // send commands to device
        await sendSingleLineText('exec("""' + lines + '""")');
    }

    async function sendCode(code) {
        if (!ready) {
            return;
        }
        addCodeHistory(code);
        if (config.raw_console.force_exec) {
            // if code running, break execution before send code
            if (output.slice(-4, -1) !== ">>>") {
                await sendCtrlC(); // break execution
                await sendCtrlC(); // jump RELP if necessary
                // TODO: This might cause a second new line in RELP when no code running
                // can be improved if know how to read updated output in the function
            }
        }
        if (code.split("\n").length > 1) {
            await sendMultiLineCode(code);
        } else {
            await sendSingleLineText(code);
        }
    }

    return { sendCtrlC, sendCtrlD, sendSingleLineText, sendCode, codeHistory };
}
