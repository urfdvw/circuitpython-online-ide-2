export default class SerialCommunication {
    constructor() {
        this.port = null;
        this.reader = null;
        this.writer = null;
        this.keepRunning = true;
        this.writeBuffer = [];
        this.readerCallbacks = {};
        // baud rate of the current/last connection; reused on automatic reconnect
        this._baudRate = 115200;

        // New state for reconnect support
        this._listening = false;
        this._lastPortInfo = null;
        this._reconnecting = false;
    }

    async open(portOptions, baudRate = 115200) {
        console.log("trying to open serial communication");
        this._baudRate = baudRate;
        if ("serial" in navigator) {
            try {
                this.port = await navigator.serial.requestPort(portOptions);
            } catch (error) {
                console.error("Error requesting serial port:", error);
                return false;
            }
            try {
                // store info for possible reconnects
                try {
                    this._lastPortInfo = this.port.getInfo ? this.port.getInfo() : null;
                } catch (e) {
                    this._lastPortInfo = null;
                }

                // Install global listeners once
                if (!this._listening) {
                    this._listening = true;
                    navigator.serial.addEventListener(
                        "disconnect",
                        this._onDisconnect.bind(this)
                    );
                    navigator.serial.addEventListener(
                        "connect",
                        this._onConnect.bind(this)
                    );
                }

                await this.port.open({ baudRate: this._baudRate });

                this.reader = this.port.readable.getReader();
                this.writer = this.port.writable.getWriter();

                this.readLoop();
                this.writeLoop();

                console.log("successfully opened serial communication");

                for (const id in this.readerCallbacks) {
                    this.readerCallbacks[id](`

================ Serial connected ================


`);
                }
                return true;
            } catch (error) {
                console.error("Error opening serial port:", error);
            }
        } else {
            console.error("Web Serial API not supported.");
        }
        return false;
    }

    async close() {
        console.log("trying to close serial communication");
        this.keepRunning = false;
        this.writeBuffer = [];

        // preserve last port info so we can attempt reconnect later
        if (this.port && this.port.getInfo) {
            try {
                this._lastPortInfo = this.port.getInfo();
            } catch (e) {
                // ignore
            }
        }

        if (this.reader) {
            try {
                await this.reader.cancel();
                await this.reader.releaseLock();
            } catch (err) {
                console.error("Failed to close reader:", err);
            }
            this.reader = null;
        }

        if (this.writer) {
            try {
                await this.writer.releaseLock();
            } catch (err) {
                console.error("Failed to close writer:", err);
            }
            this.writer = null;
        }

        if (this.port) {
            try {
                await this.port.close();
            } catch (err) {
                console.error("Failed to close port:", err);
            }
            this.port = null;
        }

        for (const id in this.readerCallbacks) {
            this.readerCallbacks[id](`

================ Serial disconnected ================


`);
        }
        console.log("closed serial communication");
    }

    registerReaderCallback(id, callback) {
        this.readerCallbacks[id] = callback;
    }

    unregisterReaderCallback(id) {
        delete this.readerCallbacks[id];
    }

    write(data) {
        this.writeBuffer.push(data);
    }

    async readLoop() {
        this.keepRunning = true;
        const decoder = new TextDecoder();
        while (this.port && this.port.readable && this.keepRunning) {
            try {
                const { value, done } = await this.reader.read();
                if (done || !this.keepRunning) {
                    break;
                }
                const decoded = decoder.decode(value);
                for (const id in this.readerCallbacks) {
                    this.readerCallbacks[id](decoded);
                }
            } catch (error) {
                console.error("Error reading from serial port:", error);
                this.close();
            }
        }
    }

    async writeLoop() {
        const encoder = new TextEncoder();
        while (this.port && this.port.writable && this.keepRunning) {
            if (this.writeBuffer.length > 0) {
                // const data = this.writeBuffer.join('');

                while (this.writeBuffer.length > 0) {
                    const data = this.writeBuffer.shift();

                    try {
                        await this.writer.write(encoder.encode(data));
                    } catch (error) {
                        console.error("Error writing to serial port:", error);
                        this.keepRunning = false;
                    }
                }

                this.writeBuffer = [];
            }
            await new Promise((resolve) => setTimeout(resolve, 1)); // Small delay to prevent high CPU usage
        }
    }

    // New: handle physical disconnect event
    _onDisconnect(event) {
        try {
            if (event && event.port && event.port.getInfo) {
                this._lastPortInfo = event.port.getInfo();
            } else if (this.port && this.port.getInfo) {
                this._lastPortInfo = this.port.getInfo();
            }
        } catch (e) {
            // ignore
        }
        console.warn("====== serial port disconnected (physical)");
        // Close current connection but keep _lastPortInfo for reconnect attempts
        this.close();
    }

    // New: handle physical connect event and try to re-open the previously used port
    async _onConnect(event) {
        // only attempt reconnect if we have info about the last port and we're not already connected/reconnecting
        if (!this._lastPortInfo || this.port || this._reconnecting) {
            return;
        }

        this._reconnecting = true;
        try {
            const ports = await navigator.serial.getPorts();
            for (const p of ports) {
                try {
                    const info = p.getInfo ? p.getInfo() : {};
                    // match using usbVendorId and usbProductId if available
                    const last = this._lastPortInfo || {};
                    if (
                        (last.usbVendorId == null || info.usbVendorId === last.usbVendorId) &&
                        (last.usbProductId == null || info.usbProductId === last.usbProductId)
                    ) {
                        // attempt to re-open the port at the same baud rate as before
                        try {
                            await p.open({ baudRate: this._baudRate });
                        } catch (openErr) {
                            console.warn("Reopen failed:", openErr);
                            continue;
                        }
                        this.port = p;
                        try {
                            this.reader = this.port.readable.getReader();
                            this.writer = this.port.writable.getWriter();
                        } catch (attachErr) {
                            console.error("Failed to attach reader/writer on reconnect:", attachErr);
                        }

                        // restart loops
                        this.keepRunning = true;
                        this.readLoop();
                        this.writeLoop();

                        // notify callbacks about reconnect
                        for (const id in this.readerCallbacks) {
                            this.readerCallbacks[id](`

================ Serial reconnected ================


`);
                        }
                        break; // stop searching after successful reconnect
                    }
                } catch (inner) {
                    // skip problematic port
                    continue;
                }
            }
        } catch (err) {
            console.error("Error while attempting reconnect:", err);
        } finally {
            this._reconnecting = false;
        }
    }
}
