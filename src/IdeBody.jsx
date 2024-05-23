/* eslint-disable react/prop-types */
// React
import { useState, useContext } from "react";
// Tabs
import IdeFolderView from "./tabs/IdeFolderView";
import IdeEditor from "./tabs/IdeEditor";
import RawConsole from "./tabs/RawConsole";
import { ConfigForms } from "./react-user-config";
import Navigation from "./tabs/Navigation";
import RawPlotter from "./tabs/RawPlotter";
import BackupDrive from "./tabs/BackupDrive";
import Document from "./tabs/Document";
import Widgets from "./tabs/Widgets";
// Flex layout
import * as FlexLayout from "flexlayout-react";
//context
import ideContext from "./ideContext";
// constant
import { FILE_EDITED } from "./constants";
// document
import AboutInfo from "./documents/wiki/About.md";
import QuickStartInfo from "./documents/wiki/Quick start.md";

const fullSize = { height: "100%", width: "100%" };

const findTabByName = (node, name) => {
    if (node.getType() === "tab" && (node.getName() === name || node.getName() === FILE_EDITED + name)) {
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

const findTabsetById = (model, tabsetId) => {
    let foundTabset = null; // Default to null if not found

    model.visitNodes((node) => {
        if (node.getType() === "tabset" && node.getId() === tabsetId) {
            foundTabset = node;
        }
    });

    return foundTabset;
};

export default function IdeBody() {
    const { flexModel: model, schemas, config, set_config } = useContext(ideContext);
    const [fileLookUp, setFileLookUp] = useState({});

    async function onFileClick(fileHandle) {
        const fileName = fileHandle.name;
        const fullPath = fileHandle.fullPath;
        const tabNode = findTabByName(model.getRoot(), fileName);

        if (tabNode instanceof FlexLayout.TabNode) {
            if (fileLookUp[tabNode.getConfig().fileKey].fullPath === fullPath) {
                console.log(fileName + " already opened");
                // Activate the found tab
                model.doAction(FlexLayout.Actions.selectTab(tabNode.getId()));
            } else {
                confirm("A file named '" + fileName + "' is already opened.\nCannot open two files with the same name");
            }
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
                    {
                        type: "tab",
                        name: fileName,
                        component: "editor",
                        config: {
                            fileKey: fileKey,
                        },
                    },

                    findTabsetById(model, "initial_tabset")
                        ? "initial_tabset"
                        : model.getActiveTabset()
                        ? model.getActiveTabset().getId()
                        : model.getRoot().getChildren()[0].getId(), // there should be at least one tabset
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
                <div className="tab_content" style={fullSize}>
                    <IdeEditor fileHandle={fileLookUp[node.getConfig().fileKey]} node={node} />
                </div>
            );
        } else if (component === "serial_raw") {
            return (
                <div className="tab_content" style={fullSize}>
                    <RawConsole />
                </div>
            );
        } else if (component === "folder_view") {
            return (
                <div className="tab_content" style={fullSize}>
                    <IdeFolderView onFileClick={onFileClick} node={node} />
                </div>
            );
        } else if (component === "settings") {
            return (
                <div className="tab_content" style={fullSize}>
                    <ConfigForms schemas={schemas} config={config} set_config={set_config} />
                </div>
            );
        }
        // tools
        else if (component === "navigation") {
            return (
                <div
                    className="tab_content"
                    // TODO style={fullSize} // no idea why this is causing a y-scroll bar
                >
                    <Navigation />
                </div>
            );
        } else if (component === "raw_plot") {
            return (
                <div className="tab_content" style={fullSize}>
                    <RawPlotter node={node} />
                </div>
            );
        } else if (component === "backup_drive") {
            return (
                <div className="tab_content">
                    <BackupDrive node={node} />
                </div>
            );
        } else if (component === "widgets") {
            return (
                <div className="tab_content">
                    <Widgets node={node} />
                </div>
            );
        }
        // document
        else if (component === "about") {
            return (
                <div className="tab_content">
                    <Document info={AboutInfo} />
                </div>
            );
        } else if (component === "quick_start") {
            return (
                <div className="tab_content">
                    <Document info={QuickStartInfo} />
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
