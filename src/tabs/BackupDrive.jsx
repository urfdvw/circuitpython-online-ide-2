// React
import { useContext } from "react";
//context
import ideContext from "../ideContext";
// mui
import Button from "@mui/material/Button";
// file system utils
import { backupFolder } from "../react-local-file-system";

export default function BackupDrive() {
    const { openBackupDirectory, rootDirHandle, backupDirectoryDirHandle, backupStatusText } = useContext(ideContext);
    return (
        <>
            {backupStatusText}
            <Button
                onClick={() => {
                    backupFolder(rootDirHandle, backupDirectoryDirHandle, true);
                }}
            >
                From CircuitPy Drive to Backup Folder
            </Button>
        </>
    );
}
