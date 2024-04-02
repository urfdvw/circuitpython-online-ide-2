// React
import { useContext } from "react";
//context
import ideContext from "../ideContext";
// mui
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

export default function BackupDrive() {
    const { openBackupDirectory, backupStatusText, lastBackupTime, backup } = useContext(ideContext);

    return (
        <Typography component="div" sx={{ margin: "20pt" }}>
            <Button onClick={openBackupDirectory}>Open Backup Directory</Button>
            <br />
            {backupStatusText}
            <br />
            <Button onClick={backup}>Manual Backup</Button>
            <br />
            {lastBackupTime ? lastBackupTime : ""}
        </Typography>
    );
}
