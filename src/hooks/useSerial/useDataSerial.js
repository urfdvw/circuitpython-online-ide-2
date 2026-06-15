import createSerialChannel from "./useSerialChannel";

// Connected-Variables data channel (CircuitPython usb_cdc.data). A second, independent serial
// port that carries only CV traffic. Display-only console + widget read/write. Built on the
// same reusable channel factory as the REPL serial; no REPL-style Ctrl-C/D refresh on connect.
const useDataChannel = createSerialChannel({ readerId: "dataChannel" });

const useDataSerial = () => {
    const channel = useDataChannel();

    return {
        connectToDataSerialPort: channel.connect,
        disconnectFromDataSerialPort: channel.disconnect,
        sendToDataSerialPort: channel.send,
        clearDataSerialOutput: channel.clearOutput,
        dataSerialOutput: channel.output,
        dataSerialReady: channel.ready,
        dataSerial: channel.serial,
    };
};

export default useDataSerial;
