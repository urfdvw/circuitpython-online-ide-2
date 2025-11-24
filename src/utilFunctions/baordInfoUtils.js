import { minor } from "@mui/material";
import { version } from "jszip";

export async function fetchLatestCircuitPythonInfo(repo) {
    const response = await fetch(`https://api.github.com/repos/adafruit/CircuitPython/releases/latest`);
    const data = await response.json();
    console.log(data);
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
