import { useState } from "react";
import * as constants from "../../constants";
import { removeCommonIndentation } from "./utils";
import { reprStr } from "../../serialFs/pythonRepr";

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
        await sendSingleLineText(`exec(${reprStr(code)})`);
    }

    // opts.silent: don't pop a confirm() dialog on failure; instead return an
    // error result object so non-interactive callers (e.g. the Agent
    // bridge) can surface the error programmatically.
    async function sendCode(code, force, opts = {}) {
        if (!serialReady) {
            if (opts.silent) return { ok: false, error: "Serial is not connected." };
            return;
        }
        addCodeHistory(code);
        code = code.split("\r").join("");
        if (!force) {
            if (serialOutput.slice(-4, -1) !== ">>>") {
                if (opts.silent) {
                    return {
                        ok: false,
                        error: "REPL is not ready. Send Ctrl-C (ctrlC()) to reach the '>>>' prompt before sending code.",
                    };
                }
                confirm("Before sending Python code to the serial console, make sure to start REPL first.");
                return;
            }
        }
        if (code.split("\n").length > 1) {
            await sendMultiLineCode(code);
        } else {
            await sendSingleLineText(code);
        }
        if (opts.silent) return { ok: true };
    }

    return { sendCtrlC, sendCtrlD, sendCode, codeHistory };
}
