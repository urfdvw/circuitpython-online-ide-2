export default class SerialCommunication {
    constructor() {
        this.port = null;
        this.reader = null;
        this.writer = null;
        this.keepRunning = true;
        this.writeBuffer = [];
        this.readerCallbacks = {};
    }

    async open(portOptions) {
        console.log("trying to open serial communication");
        if ("serial" in navigator) {
            try {
                this.port = await navigator.serial.requestPort(portOptions);
            } catch (error) {
                console.error("Error requesting serial port:", error);
                return false;
            }
            try {
                await this.port.open({ baudRate: 115200 });

                this.reader = this.port.readable.getReader();
                this.writer = this.port.writable.getWriter();

                this.readLoop();
                this.writeLoop();

                console.log("successfully opened serial communication");
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
        while (this.port.readable && this.keepRunning) {
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
        while (this.port.writable && this.keepRunning) {
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
}
