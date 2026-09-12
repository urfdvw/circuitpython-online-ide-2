/** Capture one open connection, including reconnects to the same SerialPort. */
export function captureConnection(serial) {
    const port = serial?.port;
    const writer = serial?.writer;
    if (!port || !writer) {
        throw new Error("Connect the serial port before talking to the board.");
    }
    const isCurrent = () => Boolean(
        port && writer && serial.port === port && serial.writer === writer &&
        serial.keepRunning !== false && port.connected !== false
    );
    const assertCurrent = () => {
        if (!isCurrent()) {
            throw new Error("The serial connection changed or closed. Reopen the file from the connected board before saving; your editor changes are still available.");
        }
    };
    assertCurrent();
    return { isCurrent, assertCurrent };
}
