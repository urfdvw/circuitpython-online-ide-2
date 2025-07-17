import React, { useEffect, useRef, useContext } from "react";
import { FitAddon } from "xterm-addon-fit";
import { Terminal } from "xterm";
import "xterm/css/xterm.css";
import AppContext from "../AppContext";

const invert_css = {
    WebkitFilter: "invert(100%) hue-rotate(180deg)",
    MozFilter: "invert(100%) hue-rotate(180deg)",
    OFilter: "invert(100%) hue-rotate(180deg)",
    msFilter: "invert(100%) hue-rotate(180deg)",
};

const XtermConsole = ({ setSerialTitle, clearTrigger }) => {
    const { appConfig, sendDataToSerialPort, serial } = useContext(AppContext);

    const terminalOptions = {
        convertEol: true,
        fontFamily: "monospace",
        cursorBlink: true,
        fontSize: appConfig.config.serial_console.font + 3,
    };

    const terminal = useRef(new Terminal(terminalOptions));
    const terminalRef = useRef(null);
    const fitAddon = new FitAddon();
    console.log(terminal.current);

    useEffect(() => {
        /* terminal init */
        if (!terminalRef.current) {
            return;
        }
        if (!terminal.current.element) {
            terminal.current.open(terminalRef.current);

            // data stream
            terminal.current.onData((data) => {
                sendDataToSerialPort(data);
                console.log("sent", data);
            });
            terminal.current.onTitleChange((title) => {
                console.log(title);
                setSerialTitle(title);
            });
            // auto fit
            terminal.current.loadAddon(fitAddon);
            fitAddon.fit();
            const observer = new ResizeObserver(entries => {
                for (let entry of entries) {
                    const { width, height } = entry.contentRect;
                    console.log('Size changed:', width, height);
                    fitAddon.fit();
                }
            });
            observer.observe(terminal.current.element.parentElement);
        }
        serial.registerReaderCallback("terminal", (data) => {
            terminal.current.write(data);
        });
    }, []);

    useEffect(() => {
        if (!terminal.current) {
            return;
        }
        terminal.current.options.fontSize = appConfig.config.serial_console.font + 3;
        fitAddon.fit();
    }, [appConfig.config.serial_console.font]);

    useEffect(() => {
        terminal.current.clear();
        console.log("Clear terminal", clearTrigger);
    }, [clearTrigger]);

    return (
        <div
            ref={terminalRef}
            style={{
                width: "100%",
                height: "100%",
                overflowY: "hidden",
                scrollbarColor: "#777 #000",
                ...invert_css,
            }}
        />
    );
};

export default XtermConsole;
