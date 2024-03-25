// React
import { useContext, useState, useEffect } from "react";
//context
import ideContext from "../ideContext";
// mui
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Typography from "@mui/material/Typography";
// file system utils
import { backupFolder } from "../react-local-file-system";

export default function BackupDrive() {
    const { openBackupDirectory, rootDirHandle, backupDirectoryDirHandle, backupStatusText, config } =
        useContext(ideContext);
    const [lastBackupTime, setLastBackupTime] = useState(null);
    async function backup() {
        if (!(backupDirectoryDirHandle && rootDirHandle)) {
            return;
        }
        await backupFolder(rootDirHandle, backupDirectoryDirHandle, config.backup.clean);
        console.log("backed up");
        const now = new Date().toLocaleTimeString();
        setLastBackupTime(now);
    }
    // scheduled state checking
    useEffect(() => {
        const interval = setInterval(async () => {
            if (!config.backup.enable_schedule) {
                return;
            }
            backup();
        }, 60000 * config.backup.period);
        return () => clearInterval(interval);
    }, [backupDirectoryDirHandle, config.backup.period, config.backup.clean]);
    return (
        <Typography component="div" sx={{ margin: "20pt" }}>
            <Button onClick={openBackupDirectory}>Open Backup Directory</Button>
            <br />
            {backupStatusText}
            <br />
            <Button onClick={backup}>Manual Backup</Button>
            <br />
            {lastBackupTime ? "Last backup at: " + lastBackupTime : ""}
        </Typography>
    );
}
