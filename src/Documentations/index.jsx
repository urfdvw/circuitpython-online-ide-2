import Markdown from "markdown-to-jsx";
import MdFile from "../CircuitPython-online-IDE2.wiki/About.md?raw";
// import MdFile from "./test.md?raw" 

export function About() {
    return <Markdown>{MdFile}</Markdown>;
}
