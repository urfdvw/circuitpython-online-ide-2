import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import HyperLink from "../layout/HyperLink";

export default function ContactMe() {
    return (
        <Box>
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
