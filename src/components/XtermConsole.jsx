import { useEffect, useRef, useContext, useCallback } from "react";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import AppContext from "../AppContext";

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
    sendData: sendDataProp,
    readerId = "terminal",
    enableInput = true,
}) => {
    const ctx = useContext(AppContext);
    const { appConfig, sendDataToSerialPort } = ctx;
    // Bind to a specific serial channel; default to the REPL serial from context. The data
    // console passes its own instance/output and its own send function so typed input goes
    // to that channel instead of the REPL.
    const serial = serialInstance ?? ctx.serial;
    const serialOutput = serialOutputProp ?? ctx.serialOutput;
    const sendData = sendDataProp ?? sendDataToSerialPort;

    const terminal = useRef(null);
    const terminalRef = useRef(null);
    const fitAddon = useRef(null);
    const latest = useRef(null);
    latest.current = { sendData, setSerialTitle, enableInput, serialOutput,
        fontSize: appConfig.config.serial_console.font + 3 };

    const fitIfVisible = useCallback(() => {
        const element = terminalRef.current;
        if (element?.offsetWidth > 0 && element?.offsetHeight > 0) {
            try {
                fitAddon.current?.fit();
            } catch (error) {
                console.warn("Could not resize serial console:", error);
            }
        }
    }, []);

    useEffect(() => {
        if (!terminalRef.current) return;
        const instance = new Terminal({
            convertEol: true,
            fontFamily: "monospace",
            cursorBlink: true,
            fontSize: latest.current.fontSize,
        });
        const addon = new FitAddon();
        terminal.current = instance;
        fitAddon.current = addon;
        instance.open(terminalRef.current);
        instance.loadAddon(addon);
        const input = instance.onData((data) => {
            if (latest.current.enableInput) latest.current.sendData(data);
        });
        const title = instance.onTitleChange((value) => latest.current.setSerialTitle?.(value));
        const observer = new ResizeObserver(fitIfVisible);
        observer.observe(terminalRef.current);
        fitIfVisible();
        if (latest.current.serialOutput) instance.write(latest.current.serialOutput);
        serial.registerReaderCallback(readerId, (data) => instance.write(data));

        return () => {
            serial.unregisterReaderCallback(readerId);
            observer.disconnect();
            input.dispose();
            title.dispose();
            instance.dispose();
            terminal.current = null;
            fitAddon.current = null;
        };
    }, [serial, readerId, fitIfVisible]);

    useEffect(() => {
        fitIfVisible();
        terminal.current?.scrollToBottom();
        const timer = setTimeout(() => terminal.current?.scrollToBottom(), 100);
        return () => clearTimeout(timer);
    }, [serialOutput, fitIfVisible]);

    useEffect(() => {
        if (terminal.current) terminal.current.options.fontSize = appConfig.config.serial_console.font + 3;
        fitIfVisible();
    }, [appConfig.config.serial_console.font, fitIfVisible]);

    useEffect(() => {
        terminal.current?.clear();
    }, [clearTrigger]);

    let isDarkTheme = false;
    try {
        isDarkTheme = localStorage.getItem("isDarkTheme") === "true";
    } catch {
        // Storage may be unavailable in a portable or private browser session.
    }
    const alwaysDark = appConfig.config.serial_console.always_dark;
    const color_css = alwaysDark ? (isDarkTheme ? invert_css : {}) : invert_css;

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
