// React
import { useState } from "react";
// layout
import * as FlexLayout from "flexlayout-react";
import layout from "./layout.json";
// ace
import AceEditor from "react-ace";
// folder view
import FolderView, { getFileText } from "react-local-file-system";
// config
import build_config from "../build-config.json";

function IdeFolderView({ onFileClick, openDirectory, directoryReady, rootDirHandle }) {
    // Show FolderView component only when its ready
    return directoryReady ? (
        <FolderView rootFolder={rootDirHandle} onFileClick={onFileClick} />
    ) : (
        <>
            <button onClick={openDirectory}>Open Dir</button>
        </>
    );
}

layout.global.tabEnableFloat = !build_config["single-file"];

export default function IdeBody({ openDirectory, directoryReady, rootDirHandle }) {
    const [model, setModel] = useState(FlexLayout.Model.fromJson(layout));
    const [text, setText] = useState("# Hello, *world*!");

    async function onFileClick(fileHandle) {
        const text = await getFileText(fileHandle);
        console.log("file content of", fileHandle.name, ":", text);
        setText(text);
        model.doAction(
            FlexLayout.Actions.addNode(
                { type: "tab", name: fileHandle.name, component: "editor" },
                model.getActiveTabset().getId(),
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
                    <AceEditor value={text} />
                </div>
            );
        } else if (component === "placeholder") {
            return (
                <div className="tab_content">
                    <p>{node.getName()}</p>
                </div>
            );
        } else if (component === "folder_view") {
            return (
                <IdeFolderView
                    onFileClick={onFileClick}
                    openDirectory={openDirectory}
                    directoryReady={directoryReady}
                    rootDirHandle={rootDirHandle}
                />
            );
        }
    };

    return <FlexLayout.Layout model={model} factory={factory} />;
}
