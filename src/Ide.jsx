// React
import { useCallback, useState } from "react";
// layout
import * as FlexLayout from "flexlayout-react";
import layout from "./layout.json";
// ace
import AceEditor from "react-ace";
// folder view
import FolderView, { useFileSystem, getFileText } from "react-local-file-system";
// config
import build_config from "../build-config.json";

function IdeFolderView({ onFileClick }) {
    // get folder handler and status with useFileSystem hook
    const { openDirectory, directoryReady, statusText, rootDirHandle } = useFileSystem();
    // Show FolderView component only when its ready
    return directoryReady ? (
        <FolderView rootFolder={rootDirHandle} onFileClick={onFileClick} />
    ) : (
        <>
            <button onClick={openDirectory}>Open Dir</button>
            <p>{statusText}</p>
        </>
    );
}

layout.global.tabEnableFloat = !build_config["single-file"];

export default function Ide() {
    const [model, setModel] = useState(FlexLayout.Model.fromJson(layout));
    const [text, setText] = useState("# Hello, *world*!");

    async function onFileClick(fileHandle) {
        const text = await getFileText(fileHandle);
        console.log("file content of", fileHandle.name, ":", text);
        setText(text);
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
            return <IdeFolderView onFileClick={onFileClick} />;
        }
    };

    return <FlexLayout.Layout model={model} factory={factory} />;
}
