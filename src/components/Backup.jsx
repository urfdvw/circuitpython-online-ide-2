import TabTemplate from "../utilComponents/TabTemplate";
import AppContext from "../AppContext";
import { useContext } from "react";

export default function Backup() {
    const {
        openBackupDirectory,
        backupFolderDirectoryReady,
        backupFolderStatusText,
        backupDirHandle,
        openDirectory,
        rootFolderDirectoryReady,
        rootDirHandle,
    } = useContext(AppContext);
    const menuStructure = [
        {
            label: "Open",
            options: [
                {
                    text: "Source Folder",
                    handler: openDirectory,
                },
                {
                    text: "Target Folder",
                    handler: openBackupDirectory,
                },
            ],
        },
    ].filter((x) => x);
    return <TabTemplate title="Backup" menuStructure={menuStructure}></TabTemplate>;
}
