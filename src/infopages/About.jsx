import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import HyperLink from "../layout/HyperLink";

export default function About() {
    return (
        <Box>
            <Typography variant="h5" component="h1" textAlign="center">
                CircuitPython Online IDE 2.0 Alpha
            </Typography>
            <Typography component="p" textAlign="center">
                <HyperLink text="CircuitPython" link="https://circuitpython.org/" />
                is a Python version runs on microcontrollers and single board computers. Its development is sponsored by
                <HyperLink text="Adafruit" link="https://www.adafruit.com/" />.
                <br />
                <b>CircuitPython Online IDE</b> is an open-source project published on GitHub Page under GPL 3 license.
                It is developed and maintained by
                <HyperLink text="River Wang" link="https://github.com/urfdvw" />.
            </Typography>
        </Box>
    );
}
