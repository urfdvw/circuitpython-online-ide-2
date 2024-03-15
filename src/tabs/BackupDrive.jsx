// React
import { useContext, useState } from "react";
//context
import ideContext from "../ideContext";
// mui
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
// file system utils
import { backupFolder } from "../react-local-file-system";

export default function BackupDrive() {
    const { openBackupDirectory, rootDirHandle, backupDirectoryDirHandle, backupStatusText } = useContext(ideContext);
    const [lastBackupTime, setLastBackupTime] = useState(null);
    const [clean, setClean] = useState(false);
    return (
        <>
            {backupStatusText}
            <br />
            {lastBackupTime ? "Last backup at: " + lastBackupTime : ""}
            <br />
            Clean up before each backup
            <Checkbox
                checked={clean}
                onChange={(event) => {
                    setClean(event.target.checked);
                }}
            />
            <br />
            <Button
                onClick={() => {
                    backupFolder(rootDirHandle, backupDirectoryDirHandle, clean);
                    const now = new Date().toLocaleTimeString();
                    setLastBackupTime(now);
                }}
            >
                Manual Backup
            </Button>
        </>
    );
}
