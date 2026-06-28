export function parseCircuitPythonInfo(text) {
    // Version: capture X.Y.Z (ignore suffix like -beta.2)
    const ver = String(text || "").match(/CircuitPython\s+(\d+)\.(\d+)\.(\d+)/i);
    // If we cannot identify a CircuitPython version, this isn't a valid boot_out.txt
    // -> return null so callers treat it as "not a CircuitPython drive".
    if (!ver) {
        return null;
    }

    const result = {
        cpy_version: {
            major: Number(ver[1]),
            minor: Number(ver[2]),
            patch: Number(ver[3]),
        },
        cpy_datetime: null, // YYYY-MM-DD | null
        board_id: null, // string | null
        device_id: null, // string | null
    };

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
