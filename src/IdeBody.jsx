/* eslint-disable react/prop-types */
// React
import { useState } from "react";
// layout
import * as FlexLayout from "flexlayout-react";
import layout from "./layout.json";
// Tabs
import IdeFolderView from "./IdeFolderView";
import IdeEditor from "./IdeEditor";
import RawConsole from "./RawConsole";
import { ConfigForms } from "react-user-config";

export default function IdeBody({
    openDirectory,
    directoryReady,
    rootDirHandle,
    connectToSerialPort,
    sendDataToSerialPort,
    serialOutput,
    isSerialPortConnected,
    schemas,
    config,
    set_config,
}) {
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
        } else if (component === "serial_raw") {
            return (
                <div className="tab_content" style={{ height: "calc(100% - 30px)" }}>
                    <RawConsole
                        connect={connectToSerialPort}
                        output={serialOutput}
                        send={sendDataToSerialPort}
                        ready={isSerialPortConnected}
                        config={{
                            raw_console: {
                                hide_title: true,
                                hide_cv: true,
                            },
                        }}
                    />
                </div>
            );
        } else if (component === "folder_view") {
            return (
                <div className="tab_content">
                    <IdeFolderView
                        onFileClick={onFileClick}
                        openDirectory={openDirectory}
                        directoryReady={directoryReady}
                        rootDirHandle={rootDirHandle}
                    />
                </div>
            );
        } else if (component === "placeholder") {
            return (
                <div className="tab_content">
                    <p>{node.getName()}</p>
                </div>
            );
        } else if (component === "settings") {
            return <ConfigForms schemas={schemas} config={config} set_config={set_config} />;
        }
    };

    return <FlexLayout.Layout model={model} factory={factory} />;
}
