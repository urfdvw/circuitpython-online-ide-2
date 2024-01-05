/* eslint-disable react/prop-types */
// React
import { useState, useContext } from "react";
// Tabs
import IdeFolderView from "./tabs/IdeFolderView";
import IdeEditor from "./tabs/IdeEditor";
import RawConsole from "./tabs/RawConsole";
import { ConfigForms } from "./react-user-config";
import Navigation from "./tabs/Navigation";
import About from "./infopages/About";
// Flex layout
import * as FlexLayout from "flexlayout-react";
//context
import ideContext from "./ideContext";

export default function IdeBody() {
    const { flexModel: model, schemas, config, set_config } = useContext(ideContext);
    const [fileLookUp, setFileLookUp] = useState({});

    async function onFileClick(fileHandle) {
        const fileKey = crypto.randomUUID();
        setFileLookUp((cur) => {
            return {
                ...cur,
                [fileKey]: fileHandle,
            };
        });
        model.doAction(
            FlexLayout.Actions.addNode(
                { type: "tab", name: fileHandle.name, component: "editor", config: { fileKey: fileKey } },

                model.getActiveTabset() ? model.getActiveTabset().getId() : "initial_tabset",
                FlexLayout.DockLocation.CENTER,
                -1
            )
        );
    }

    const factory = (node) => {
        var component = node.getComponent();
        if (component === "editor") {
            return (
                <div className="tab_content">
                    <IdeEditor fileHandle={fileLookUp[node.getConfig().fileKey]} node={node} />
                </div>
            );
        } else if (component === "serial_raw") {
            return (
                <div
                    className="tab_content"
                    style={{
                        height: "100%",
                    }}
                >
                    <RawConsole />
                </div>
            );
        } else if (component === "folder_view") {
            return (
                <div className="tab_content">
                    <IdeFolderView onFileClick={onFileClick} />
                </div>
            );
        } else if (component === "navigation") {
            return (
                <div className="tab_content">
                    <Navigation />
                </div>
            );
        } else if (component === "about") {
            return (
                <div className="tab_content">
                    <About />
                </div>
            );
        } else if (component === "settings") {
            return <ConfigForms schemas={schemas} config={config} set_config={set_config} />;
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
