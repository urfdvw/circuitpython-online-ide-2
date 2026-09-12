import { useState } from "react";
import { findTabsetById, openTab } from "../layout/layoutUtils";
import * as FlexLayout from "flexlayout-react";

// canonical Connected Variable Widgets config file; opens in the Widgets tab, not the editor
const WIDGETS_CONFIG_PATH = "/ide/widgets.json";

export default function useEditorTabs(flexModel) {
    const [fileLookUp, setFileLookUp] = useState({});

    async function onFileClick(fileHandle) {
        const fileName = fileHandle.name;
        const fullPath = fileHandle.fullPath;

        // route the widgets config to the Widgets tab instead of a JSON editor
        if (fullPath === WIDGETS_CONFIG_PATH) {
            openTab(flexModel, "Widgets", "widgets");
            return;
        }

        let tabNode = null;
        flexModel.visitNodes((node) => {
            if (node.getType() !== "tab" || node.getComponent() !== "editor") return;
            const handle = fileLookUp[node.getConfig()?.fileKey];
            if (handle?.fullPath === fullPath) tabNode = node;
        });
        // Different folders can contain files with the same display name.
        if (tabNode) {
            flexModel.doAction(FlexLayout.Actions.selectTab(tabNode.getId()));
        } else {
            const fileKey = crypto.randomUUID();
            setFileLookUp((cur) => {
                return {
                    ...cur,
                    [fileKey]: fileHandle,
                };
            });
            flexModel.doAction(
                FlexLayout.Actions.addNode(
                    {
                        type: "tab",
                        name: fileName,
                        component: "editor",
                        config: {
                            fileKey: fileKey,
                        },
                    },

                    findTabsetById(flexModel, "initial_tabset")
                        ? "initial_tabset"
                        : flexModel.getActiveTabset()
                        ? flexModel.getActiveTabset().getId()
                        : flexModel.getRoot().getChildren()[0].getId(), // there should be at least one tabset
                    FlexLayout.DockLocation.CENTER,
                    -1
                )
            );
        }
    }
    return { onFileClick , fileLookUp};
}
