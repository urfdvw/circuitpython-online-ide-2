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

    const terminalOptions = {
        convertEol: true,
        fontFamily: "monospace",
        cursorBlink: true,
        fontSize: appConfig.config.serial_console.font + 3,
    };

    const terminal = useRef(new Terminal(terminalOptions));
    const terminalRef = useRef(null);
    // stable instance, loaded once (a fresh one each render would break later fit() calls)
    const fitAddon = useRef(new FitAddon()).current;

    // Only fit when visible & sized: FlexLayout gives hidden tabs zero size, and fitting then
    // collapses the terminal to a tiny width and wraps incoming data.
    const fitIfVisible = () => {
        const el = terminalRef.current;
        if (el && el.offsetWidth > 0 && el.offsetHeight > 0) {
            try {
                fitAddon.fit();
            } catch (e) {
                /* terminal not attached yet */
            }
        }
    };

    useEffect(() => {
        /* terminal init */
        if (!terminalRef.current) {
            console.error("Error initializing terminal");
            return;
        }
        if (!terminal.current.element) {
            terminal.current.open(terminalRef.current);

            // typed keystrokes are written to this console's serial channel
            if (enableInput) {
                terminal.current.onData((data) => {
                    sendData(data);
                    console.log("sent", data);
                });
            }
            terminal.current.onTitleChange((title) => {
                console.log(title);
                if (setSerialTitle) setSerialTitle(title);
            });
            // auto fit
            terminal.current.loadAddon(fitAddon);
            fitIfVisible();
            const observer = new ResizeObserver(() => {
                fitIfVisible();
            });
            observer.observe(terminal.current.element.parentElement);

            // Backfill the output received before this console mounted (it gates on output > 0).
            if (serialOutput) {
                terminal.current.write(serialOutput);
            }
        }

        // Register OUTSIDE the open-once guard so it survives a StrictMode remount — the 2nd mount
        // skips the guarded block, which would otherwise leave the terminal with no subscription.
        serial.registerReaderCallback(readerId, (data) => {
            terminal.current.write(data);
        });

        return () => {
            serial.unregisterReaderCallback(readerId);
        };
    }, []);

    useEffect(() => {
        // re-fit on new output: catches a foreground transition and reflows anything wrapped while hidden
        fitIfVisible();
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
        fitIfVisible();
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
