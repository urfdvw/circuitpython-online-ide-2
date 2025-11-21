import MarkdownExtended from "../utilComponents/MarkdownExtended";
import Home from "../docs/Home.md";
import About from "../docs/About.md";

export default function MobileSupportInfo() {
    const video =
        "[![Quick introduction to CircuitPython Online IDE](https://img.youtube.com/vi/kq554m21G4A/0.jpg)](https://www.youtube.com/watch?v=kq554m21G4A)";
    return <MarkdownExtended>{[video, Home, About].join("\n\n")}</MarkdownExtended>;
}
