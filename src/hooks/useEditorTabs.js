import { useState } from "react";
import { findTabByName, findTabsetById, openTab } from "../layout/layoutUtils";
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

        const tabNode = findTabByName(flexModel.getRoot(), fileName);

        if (tabNode instanceof FlexLayout.TabNode) {
            if (fileLookUp[tabNode.getConfig().fileKey].fullPath === fullPath) {
                console.log(fileName + " already opened");
                // Activate the found tab
                flexModel.doAction(FlexLayout.Actions.selectTab(tabNode.getId()));
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
