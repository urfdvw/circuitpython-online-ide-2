export function parseCircuitPythonInfo(text) {
    const result = {
        cpy_version: null,     // { major, minor, patch } | null
        cpy_datetime: null,    // YYYY-MM-DD | null
        board_id: null,        // string | null
        device_id: null        // string | null
    };

    // Version: capture X.Y.Z (ignore suffix like -beta.2)
    const ver = text.match(/CircuitPython\s+(\d+)\.(\d+)\.(\d+)/i);
    if (ver) {
        result.cpy_version = {
            major: Number(ver[1]),
            minor: Number(ver[2]),
            patch: Number(ver[3]),
        };
    }

    // Datetime: only keep the date (YYYY-MM-DD), strip time if present
    const dt = text.match(/on\s+(\d{4}-\d{2}-\d{2})/i);
    if (dt) {
        result.cpy_datetime = dt[1];
    }

    // Board ID
    const board = text.match(/Board ID\s*:\s*([^\n\r]+)/i);
    if (board) {
        result.board_id = board[1].trim();
    }

    // UID / device id
    const uid = text.match(/UID\s*:\s*([^\n\r]+)/i);
    if (uid) {
        result.device_id = uid[1].trim();
    }

    return result;
}

// 1) Standard input
console.log(parseCircuitPythonInfo(
    `Adafruit CircuitPython 9.2.8 on 2025-05-28; Seeed XIAO nRF52840 Sense with nRF52840
Board ID:Seeed_XIAO_nRF52840_Sense
UID:E0CFB8EC6E96AEC0`
));
// Expected: cpy_datetime = '2025-05-28'

// 2) Version with prerelease suffix, timestamp included
console.log(parseCircuitPythonInfo(
    `Adafruit CircuitPython 8.1.0-beta.2 on 2024-03-10 14:22:05Z; Feather RP2040
Board ID:Feather_RP2040
UID:123456789ABCDEF0`
));
// Expected: cpy_version = {8,1,0}, cpy_datetime = '2024-03-10'

// 3) Missing UID
console.log(parseCircuitPythonInfo(
    `Adafruit CircuitPython 7.3.3 on 2023-11-11; ESP32-S3 DevKitC
Board ID:ESP32S3_DevKitC`
));
// Expected: device_id = null, cpy_datetime = '2023-11-11'

// 4) Missing Board ID
console.log(parseCircuitPythonInfo(
    `Adafruit CircuitPython 9.0.1 on 2025-01-15; Pico W
UID:ABCDEF1234567890`
));
// Expected: board_id = null, cpy_datetime = '2025-01-15'

// 5) Corrupted / partial input
console.log(parseCircuitPythonInfo(
    `CircuitPython 6.2.0 something weird happened`
));
// Expected: cpy_datetime = null

// 6) Case-insensitivity & spacing
console.log(parseCircuitPythonInfo(
    `adafruit circuitpython 9.9.0 ON 2026-02-29; Something
Board ID :  Custom_Board
UID : 00FFEE1122334455`
));
// Expected: cpy_datetime = '2026-02-29'

// 7) Lots of trailing text (noise)
console.log(parseCircuitPythonInfo(
    `Adafruit CircuitPython 9.5.1 on 2025-08-20; Random Board
Board ID:RandomBoard123
UID:ABC123DEF456
Some random notes here...
More debug lines...`
));
// Expected: cpy_datetime = '2025-08-20'

// 8) Version with beta.2 suffix (ignored in parsed object)
console.log(parseCircuitPythonInfo(
    `Adafruit CircuitPython 10.0.0-beta.2 on 2026-01-01; Fancy Board
Board ID:Fancy_Board
UID:FA1234567890`
));
// Expected: cpy_version = {10,0,0}, cpy_datetime = '2026-01-01'
