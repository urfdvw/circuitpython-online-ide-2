import { useState, useEffect, useCallback } from "react";
import SerialCommunication from "./serial";

/**
 * Factory that returns a self-contained serial-channel hook bound to its own
 * SerialCommunication instance. The returned hook is channel-agnostic (no REPL-specific
 * behaviour) and is reused for the REPL console, the Connected-Variables data channel
 * (usb_cdc.data), and any future serial interface.
 *
 * Usage:
 *   const useReplChannel = createSerialChannel({ readerId: "dataFromMcu" });
 *   ...inside a component/hook: const ch = useReplChannel();
 *
 * @param {object}  opts
 * @param {string}  opts.readerId  unique id used to register this channel's reader callback
 */
export default function createSerialChannel({ readerId = "channel" } = {}) {
    // one persistent instance per channel (created once at module load, like the REPL serial)
    const serial = new SerialCommunication();

    return function useSerialChannel() {
        const [ready, setReady] = useState(false);
        const [output, setOutput] = useState("");

        useEffect(() => {
            if (!navigator.serial) {
                console.error("Web Serial API not supported");
            }
            // accumulate the full history of this channel
            serial.registerReaderCallback(readerId, (data) => {
                setOutput((previousOutput) => previousOutput + data);
            });
            return () => {
                serial.unregisterReaderCallback(readerId);
            };
        }, []);

        // reflect unexpected port close
        useEffect(() => {
            setReady(serial.port ? serial.port.connected : false);
        }, [serial.port, serial.port && serial.port.connected]);

        const disconnect = useCallback(async () => {
            await serial.close();
            setReady(false);
        }, []);

        const send = useCallback(async (data) => {
            try {
                serial.write(data);
            } catch (err) {
                console.error(`[${readerId}] failed to send:`, err);
            }
        }, []);

        // open the port (prompting the browser picker); returns whether it connected.
        // `options.baudRate` overrides the default (used by the Data Serial channel).
        const connect = useCallback(async (options) => {
            if (ready) {
                if (confirm("Do you want to connect to a new device?")) {
                    await disconnect();
                } else {
                    return false;
                }
            }
            try {
                const status = await serial.open(undefined, options && options.baudRate);
                setReady(status);
                if (!status) {
                    serial.close();
                }
                return status;
            } catch (err) {
                console.error(`[${readerId}] failed to connect:`, err);
                return false;
            }
        }, [ready, disconnect]);

        const addToOutput = useCallback((text) => {
            setOutput((prev) => prev + text);
        }, []);

        const clearOutput = useCallback(() => {
            setOutput("");
        }, []);

        return { connect, disconnect, send, addToOutput, clearOutput, output, ready, serial };
    };
}
