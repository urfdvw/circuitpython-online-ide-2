import MarkdownExtended from "../utilComponents/MarkdownExtended";
import Home from "../docs/Home.md";
import About from "../docs/About.md";

export default function MobileSupportInfo() {
    return <MarkdownExtended>{[Home, About].join("\n\n")}</MarkdownExtended>;
}
