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
import ContactMe from "./infopages/ContactMe";
// Flex layout
import * as FlexLayout from "flexlayout-react";
//context
import ideContext from "./ideContext";

const findTabByName = (node, name) => {
    if (node.getType() === "tab" && node.getName() === name) {
        return node;
    }
    if (node.getChildren) {
        for (let child of node.getChildren()) {
            const found = findTabByName(child, name);
            if (found) return found;
        }
    }
    return null;
};

export default function IdeBody() {
    const { flexModel: model, schemas, config, set_config } = useContext(ideContext);
    const [fileLookUp, setFileLookUp] = useState({});

    async function onFileClick(fileHandle) {
        const fileName = fileHandle.name;
        const tabNode = findTabByName(model.getRoot(), fileName);

        if (tabNode instanceof FlexLayout.TabNode) {
            console.log(fileName + " already opened");
            // Activate the found tab
            model.doAction(FlexLayout.Actions.selectTab(tabNode.getId()));
        } else {
            const fileKey = crypto.randomUUID();
            setFileLookUp((cur) => {
                return {
                    ...cur,
                    [fileKey]: fileHandle,
                };
            });
            model.doAction(
                FlexLayout.Actions.addNode(
                    { type: "tab", name: fileName, component: "editor", config: { fileKey: fileKey } },

                    model.getActiveTabset() ? model.getActiveTabset().getId() : "initial_tabset",
                    FlexLayout.DockLocation.CENTER,
                    -1
                )
            );
        }
    }

    const factory = (node) => {
        var component = node.getComponent();
        // main ones
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
        } else if (component === "settings") {
            return <ConfigForms schemas={schemas} config={config} set_config={set_config} />;
        }
        // info
        else if (component === "navigation") {
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
        } else if (component === "contact") {
            return (
                <div className="tab_content">
                    <ContactMe />
                </div>
            );
        }
        // placeholder
        else if (component === "placeholder") {
            return (
                <div className="tab_content">
                    <p>{node.getName()}</p>
                </div>
            );
        }
    };

    return <FlexLayout.Layout model={model} factory={factory} />;
}
