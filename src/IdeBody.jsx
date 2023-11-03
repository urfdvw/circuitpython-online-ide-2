/* eslint-disable react/prop-types */
// React
import { useState } from "react";
// layout
import * as FlexLayout from "flexlayout-react";
import layout from "./layout.json";
// folder view
import FolderView, { getFileText } from "react-local-file-system";
// editor tab
import IdeEditor from "./IdeEditor";
// config
import build_config from "../build-config.json";
layout.global.tabEnableFloat = !build_config["single-file"];

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

export default function IdeBody({ openDirectory, directoryReady, rootDirHandle }) {
    const [model, setModel] = useState(FlexLayout.Model.fromJson(layout));
    const [text, setText] = useState("# Hello, *world*!");
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
                    <IdeEditor fileHandle={fileLookUp[node.getConfig().fileKey]} node={node} />
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
