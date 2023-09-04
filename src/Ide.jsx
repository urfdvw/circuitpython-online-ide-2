// React
import { useState } from "react";
// layout
import * as FlexLayout from "flexlayout-react";
import layout from "./layout.json";
// ace
import AceEditor from "react-ace";

export default function Ide() {
    const [model, setModel] = useState(FlexLayout.Model.fromJson(layout));
    const [text, setText] = useState("# Hello, *world*!");

    const factory = (node) => {
        var component = node.getComponent();
        if (component === "editor") {
            return (
                <div className="tab_content">
                    <AceEditor />
                </div>
            );
        } else if (component === "preview") {
            return (
                <div className="tab_content">
                    <p>Preview</p>
                </div>
            );
        }
    };

    return <FlexLayout.Layout model={model} factory={factory} />;
}
