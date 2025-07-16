import React, { useEffect, useRef, useContext } from "react";
import { FitAddon } from "xterm-addon-fit";
import { Terminal } from "xterm";
import "xterm/css/xterm.css";
import AppContext from "../AppContext";

const XtermConsole = ({setSerialTitle}) => {
    const { appConfig, sendDataToSerialPort, serial } = useContext(AppContext);

    const terminalOptions = {
        convertEol: true,
        fontFamily: "monospace",
        cursorBlink: true,
        fontSize: appConfig.config.serial_console.font + 3,
        theme: {
            background: "#ffffff",
            foreground: "#000000",
        },
    };

    const terminal = useRef(new Terminal(terminalOptions));
    const terminalRef = useRef(null);
    const fitAddon = useRef(new FitAddon());
    console.log(terminal.current);

    useEffect(() => {
        /* terminal init */
        if (!terminalRef.current) {
            return;
        }
        if (!terminal.current.element) {
            terminal.current.open(terminalRef.current);
        }
        // fit
        terminal.current.loadAddon(fitAddon.current);
        fitAddon.current.fit();
        // data stream
        terminal.current.onData((data) => {
            sendDataToSerialPort(data);
            console.log("sent", data);
        });
        terminal.current.onTitleChange((title) => {
            console.log(title);
            setSerialTitle(title);
        });
        serial.registerReaderCallback("terminal", (data) => {
            terminal.current.write(data);
        });
    }, []);

    useEffect(() => {
        if (!terminal.current) {
            return;
        }
        terminal.current.options.fontSize = appConfig.config.serial_console.font + 3;
        fitAddon.current.fit();
    }, [appConfig.config.serial_console.font]);

    useEffect(() => {
        setInterval(() => {
            if (terminal.current) {
                fitAddon.current.fit();
            }
        }, 1000); // Adjust the interval as needed
    }, []);

    return (
        <div
            ref={terminalRef}
            style={{
                width: "100%",
                height: "100%",
                backgroundColor: "#ffffff",
                overflowY: "hidden",
            }}
        ></div>
    );
};

export default XtermConsole;
