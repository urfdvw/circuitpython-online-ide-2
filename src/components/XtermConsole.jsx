import { useEffect, useRef, useContext } from "react";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import AppContext from "../AppContext";
import { sleep } from "../utilFunctions/debuggerUtils";

const invert_css = {
    WebkitFilter: "invert(100%) hue-rotate(180deg)",
    MozFilter: "invert(100%) hue-rotate(180deg)",
    OFilter: "invert(100%) hue-rotate(180deg)",
    msFilter: "invert(100%) hue-rotate(180deg)",
};

const XtermConsole = ({
    setSerialTitle,
    clearTrigger,
    serialInstance,
    serialOutput: serialOutputProp,
    readerId = "terminal",
    enableInput = true,
}) => {
    const ctx = useContext(AppContext);
    const { appConfig, sendDataToSerialPort } = ctx;
    // Bind to a specific serial channel; default to the REPL serial from context. The data
    // console passes its own instance/output and disables keyboard input (display-only).
    const serial = serialInstance ?? ctx.serial;
    const serialOutput = serialOutputProp ?? ctx.serialOutput;

    const terminalOptions = {
        convertEol: true,
        fontFamily: "monospace",
        cursorBlink: true,
        fontSize: appConfig.config.serial_console.font + 3,
    };

    const terminal = useRef(new Terminal(terminalOptions));
    const terminalRef = useRef(null);
    const fitAddon = new FitAddon();

    useEffect(() => {
        /* terminal init */
        if (!terminalRef.current) {
            console.error("Error initializing terminal");
            return;
        }
        if (!terminal.current.element) {
            terminal.current.open(terminalRef.current);

            // data stream (REPL console types into the board; display-only consoles don't)
            if (enableInput) {
                terminal.current.onData((data) => {
                    sendDataToSerialPort(data);
                    console.log("sent", data);
                });
            }
            terminal.current.onTitleChange((title) => {
                console.log(title);
                if (setSerialTitle) setSerialTitle(title);
            });
            // auto fit
            terminal.current.loadAddon(fitAddon);
            fitAddon.fit();
            const observer = new ResizeObserver((entries) => {
                for (let entry of entries) {
                    const { width, height } = entry.contentRect;
                    console.log("Size changed:", width, height);
                    fitAddon.fit();
                }
            });
            observer.observe(terminal.current.element.parentElement);

            // Backfill: this console only mounts once its output is non-empty, so the terminal
            // would otherwise miss everything received before it mounted (it shows in the raw log
            // but not here). Write the accumulated output once, on open.
            if (serialOutput) {
                terminal.current.write(serialOutput);
            }
        }

        // Register the reader callback OUTSIDE the open-once guard so it survives React StrictMode
        // remounts (mount → cleanup → mount). If it were inside the guard, the second mount would
        // skip it (element already exists) and the terminal would end up with no data subscription.
        serial.registerReaderCallback(readerId, (data) => {
            terminal.current.write(data);
        });

        return () => {
            serial.unregisterReaderCallback(readerId);
        };
    }, []);

    useEffect(() => {
        async function scroll() {
            terminal.current.scrollToBottom();
            await sleep(100);
            terminal.current.scrollToBottom();
        }
        scroll();
    }, [serialOutput]);

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

    let isDarkTheme = JSON.parse(localStorage.getItem("isDarkTheme"));
    let always_dark = appConfig.config.serial_console.always_dark;
    let color_css = always_dark ? (isDarkTheme ? { ...invert_css } : {}) : invert_css;

    return (
        <div
            ref={terminalRef}
            style={{
                width: "100%",
                height: "100%",
                overflowY: "hidden",
                scrollbarColor: "#777 #000",
                ...color_css,
            }}
        />
    );
};

export default XtermConsole;
