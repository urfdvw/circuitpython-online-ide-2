/**
 * Fetch the latest CircuitPython release from GitHub.
 * Returns { datetime: "YYYY-MM-DD", version: {major, minor, patch}, name }.
 */
export async function fetchLatestCircuitPythonInfo() {
    const response = await fetch(`https://api.github.com/repos/adafruit/CircuitPython/releases/latest`);
    const data = await response.json();
    return {
        datetime: data.published_at.split("T").at(0),
        version: {
            major: parseInt(data.tag_name.split(".").at(0)),
            minor: parseInt(data.tag_name.split(".").at(1)),
            patch: parseInt(data.tag_name.split(".").at(2)),
        },
        name: data.name,
    };
}
