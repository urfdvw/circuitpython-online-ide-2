import { useContext } from "react";
import FolderView from "../utilComponents/react-local-file-system";
import Button from "@mui/material/Button";
//context
import AppContext from "../AppContext";
import MenuBar from "../utilComponents/MenuBar";
import { selectTabById } from "../layout/layoutUtils";

export default function IdeFolderView({ node }) {
    const { openDirectory, rootFolderDirectoryReady, rootDirHandle, onFileClick, helpTabSelection, flexModel } =
        useContext(AppContext);
    // Show FolderView component only when its ready
    const menuStructure = [
        {
            label: "≡",
            options: [
                {
                    text: "Help",
                    handler: () => {
                        console.log("Folder View -> Help");
                        selectTabById(flexModel, "help_tab");
                        helpTabSelection.setTabName("folder_view");
                    },
                },
            ],
        },
    ];

    return rootFolderDirectoryReady ? (
        <div style={{ height: "100%" }}>
            <FolderView
                rootFolder={rootDirHandle}
                onFileClick={onFileClick}
                additionalElement={<MenuBar menuStructure={menuStructure} />}
            />
        </div>
    ) : (
        <>
            <Button onClick={openDirectory}>Open CircuitPy Drive</Button>
        </>
    );
}
