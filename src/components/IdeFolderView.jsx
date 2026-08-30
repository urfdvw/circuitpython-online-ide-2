import { useContext } from "react";
import FolderView from "../utilComponents/react-local-file-system";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
//context
import AppContext from "../AppContext";
import { selectTabById } from "../layout/layoutUtils";
import { FILE_SOURCE } from "../hooks/useFileSource";

export default function IdeFolderView() {
    const {
        openDirectory,
        rootFolderDirectoryReady,
        rootDirHandle,
        onFileClick,
        helpTabSelection,
        flexModel,
        fileSource,
        fileSourceName,
        autoWatchFiles,
        refreshFileSource,
    } = useContext(AppContext);
    const usingSerial = fileSource === FILE_SOURCE.SERIAL;
    // Show FolderView component only when its ready
    const menuStructure = [
        {
            label: "≡",
            options: [
                {
                    text: `Open ${fileSourceName}`,
                    handler: openDirectory,
                },
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

    if (rootFolderDirectoryReady) {
        return (
            <div style={{ height: "100%" }}>
                <FolderView
                    rootFolder={rootDirHandle}
                    onFileClick={onFileClick}
                    additionalElement={menuStructure}
                    autoRefresh={autoWatchFiles}
                    onRefresh={refreshFileSource}
                />
            </div>
        );
    }

    // In serial mode there is no folder to pick; the port is what's missing.
    if (usingSerial) {
        return (
            <Typography component="div" sx={{ margin: "10pt" }}>
                <p>
                    Board files are set to load over <b>USB serial</b>.
                </p>
                <p>Connect the serial port in the Navigation tab to browse them.</p>
            </Typography>
        );
    }

    return (
        <>
            <Button onClick={openDirectory}>Open {fileSourceName}</Button>
        </>
    );
}
