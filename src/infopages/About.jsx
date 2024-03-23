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
            <Typography variant="h5" component="h1" textAlign="center">
                Contact Me
            </Typography>
            <Typography component="p" textAlign="center">
                Email: urfdvw@gmail.com
                <br />
                <HyperLink
                    text="IDE Feedback Survey"
                    link="https://docs.google.com/forms/d/e/1FAIpQLSdupiJIRViFwPpuQC1hMp8gRvhxACLoAjgepm_-IRZumwK7Cg/viewform?usp=sf_link"
                />
                <br />
                <HyperLink text="Github: urfdvw" link="https://github.com/urfdvw" />
                <br />
                <HyperLink text="Mastodon: @Riverwang@fosstodon.org" link="https://fosstodon.org/@Riverwang" />
                <br />
                <HyperLink text="Twitter: @River___Wang" link="https://twitter.com/River___Wang" />
                <br />
                <HyperLink
                    text="YouTube Channel: @Riverwang"
                    link="https://www.youtube.com/channel/UCeunCRTBkjHWynMl4I4le_A"
                />
            </Typography>
        </Box>
    );
}
