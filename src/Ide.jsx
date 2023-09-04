// React
import { useState } from "react";
// layout
import * as FlexLayout from "flexlayout-react";
import layout from "./layout.json";
// ace
import AceEditor from "react-ace";
// config
import build_config from "../build-config.json";

layout.global.tabEnableFloat = !build_config["single-file"];

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
        } else if (component === "placeholder") {
            return (
                <div className="tab_content">
                    <p>{node.getName()}</p>
                </div>
            );
        }
    };

    return <FlexLayout.Layout model={model} factory={factory} />;
}
