import TabTemplate from "../utilComponents/TabTemplate";
import AppContext from "../AppContext";
import { useContext, useEffect, useState, useCallback } from "react";
import { Typography, Box, Button } from "@mui/material";
import TextDiffViewer from "../utilComponents/TextDiffViewer";
import { selectTabById } from "../layout/layoutUtils";

import { backupFolder, compareFolders } from "../utilComponents/react-local-file-system";

export default function Backup() {
    const {
        flexModel,
        appConfig,
        openBackupDirectory,
        backupFolderDirectoryReady,
        backupDirHandle,
        openDirectory,
        rootFolderDirectoryReady,
        rootDirHandle,
        helpTabSelection,
        configTabSelection,
    } = useContext(AppContext);
    const [lastBackupTime, setLastBackupTime] = useState(null);
    const [lastRecoverTime, setLastRecoverTime] = useState(null);
    const [lastRefreshTime, setLastRefreshTime] = useState(null);
    const [codeDiff, setCodeDiff] = useState(null);
    useEffect(() => {
        if (!backupFolderDirectoryReady) {
            setLastBackupTime(null);
        }
    }, [backupFolderDirectoryReady]);

    const refresh = useCallback(async () => {
        if (!(backupDirHandle && rootDirHandle)) {
            return;
        }
        const diff = await compareFolders(rootDirHandle, backupDirHandle);
        setCodeDiff(diff);

        const now = new Date().toLocaleTimeString();
        setLastRefreshTime(now);
        console.log("Last refresh at: " + now);
    }, [backupDirHandle, rootDirHandle]);

    const backup = useCallback(
        async (toPC) => {
            if (await backupDirHandle.isSameEntry(rootDirHandle)) {
                console.log(backupDirHandle.name);
                console.log(rootDirHandle.name);
                console.error("Cannot backup to the folder itself.");
                confirm("Cannot backup to the folder itself.");
                return;
            }
            if (!(backupDirHandle && rootDirHandle)) {
                return;
            }
            const now = new Date().toLocaleTimeString();
            if (toPC) {
                await backupFolder(rootDirHandle, backupDirHandle, appConfig.ready && appConfig.config.backup.clean);
                setLastBackupTime(now);
                console.log("Last backup at: " + now);
            } else {
                await backupFolder(backupDirHandle, rootDirHandle, appConfig.ready && appConfig.config.backup.clean);
                setLastRecoverTime(now);
                console.log("Last recover at: " + now);
            }
        },
        [backupDirHandle, rootDirHandle, appConfig.ready, appConfig.config.backup.clean]
    );

    useEffect(() => {
        const interval = setInterval(async () => {
            if (!(appConfig.ready && appConfig.config.backup.enable_backup_schedule)) {
                return;
            }
            backup(true);
        }, 60000 * (appConfig.ready && appConfig.config.backup.backup_period));
        return () => clearInterval(interval);
    }, [
        backup,
        appConfig.ready,
        appConfig.config.backup.enable_backup_schedule,
        appConfig.config.backup.backup_period,
    ]);

    useEffect(() => {
        const interval = setInterval(async () => {
            if (!(appConfig.ready && appConfig.config.backup.enable_refresh_schedule)) {
                return;
            }
            refresh();
        }, 60000 * (appConfig.ready && appConfig.config.backup.refresh_period));
        return () => clearInterval(interval);
    }, [
        refresh,
        appConfig.ready,
        appConfig.config.backup.enable_refresh_schedule,
        appConfig.config.backup.refresh_period,
    ]);

    const menuStructure = [
        {
            label: "Open",
            options: [
                {
                    text: "Microcontroller Folder",
                    handler: openDirectory,
                },
                {
                    text: "Computer Folder",
                    handler: openBackupDirectory,
                },
            ],
        },
        {
            text: codeDiff ? "Refresh Diff" : "View Diff",
            handler: refresh,
        },
        {
            label: "Sync",
            options: [
                {
                    text: "Backup to Computer",
                    handler: async () => {
                        const isConfirmed = window.confirm("Backup to Computer?");
                        if (isConfirmed) {
                            await backup(true);
                            console.log("Action was confirmed and executed.");
                            await refresh();
                        } else {
                            console.log("Action was cancelled by the user.");
                        }
                    },
                },
                {
                    text: "Recover from Computer",
                    handler: async () => {
                        const isConfirmed = window.confirm("Recover from Computer?");
                        if (isConfirmed) {
                            await backup(false);
                            console.log("Action was confirmed and executed.");
                            await refresh();
                        } else {
                            console.log("Action was cancelled by the user.");
                        }
                    },
                },
            ],
        },
        {
            label: "≡",
            options: [
                {
                    text: "Settings",
                    handler: () => {
                        console.log("Editor -> Settings");
                        selectTabById(flexModel, "settings_tab");
                        configTabSelection.setTabName("backup");
                    },
                },
                {
                    text: "Help",
                    handler: () => {
                        console.log("Editor -> Help");
                        selectTabById(flexModel, "help_tab");
                        helpTabSelection.setTabName("backup");
                    },
                },
            ],
        },
    ].filter((x) => x);

    return (
        <TabTemplate title="Backup" menuStructure={menuStructure}>
            <Box sx={{ width: "100%", height: "100%", padding: "0px", margin: "0px" }}>
                <Typography gutterBottom>
                    Microcontroller Folder:{" "}
                    <Button onClick={openDirectory}>
                        {rootFolderDirectoryReady ? rootDirHandle.name : "Open Folder"}
                    </Button>
                    {rootFolderDirectoryReady ? "✅" : ""}
                </Typography>
                <Typography gutterBottom>
                    Computer Folder:{" "}
                    <Button onClick={openBackupDirectory}>
                        {backupFolderDirectoryReady ? backupDirHandle.name : "Open Folder"}
                    </Button>
                    {backupFolderDirectoryReady ? "✅" : ""}
                </Typography>

                {lastBackupTime || lastRecoverTime || lastRefreshTime ? <hr /> : null}
                {lastBackupTime ? <Typography gutterBottom>Last Backup : {lastBackupTime}</Typography> : null}
                {lastRecoverTime ? <Typography gutterBottom>Last Recover : {lastRecoverTime}</Typography> : null}
                {lastRefreshTime ? <Typography gutterBottom>Last Refresh : {lastRefreshTime}</Typography> : null}

                {codeDiff ? (
                    <>
                        <hr />
                        {codeDiff.newFiles.length > 0 ? (
                            <>
                                <Typography variant="h6">Files only on microcontroller</Typography>
                                {[
                                    codeDiff.newFiles.map((file) => (
                                        <Box key={file.path}>
                                            <Typography variant="div">{file.path}</Typography>
                                            <TextDiffViewer oldText="" newText={file.text} />
                                        </Box>
                                    )),
                                ]}
                            </>
                        ) : null}
                        {codeDiff.removedFiles.length > 0 ? (
                            <>
                                <Typography variant="h6">Files only on compouter</Typography>
                                {[
                                    codeDiff.removedFiles.map((file) => (
                                        <Box key={file.path}>
                                            <Typography>{file.path}</Typography>
                                            <TextDiffViewer oldText={file.text} newText="" />
                                        </Box>
                                    )),
                                ]}
                            </>
                        ) : null}
                        {codeDiff.editedFiles.length > 0 ? (
                            <>
                                <Typography variant="h6">Edited Files</Typography>
                                {[
                                    codeDiff.editedFiles.map((file) => (
                                        <Box key={file.path}>
                                            <Typography>{file.path}</Typography>
                                            <TextDiffViewer
                                                oldText={file.sourceFileText}
                                                newText={file.targetFileText}
                                            />
                                        </Box>
                                    )),
                                ]}
                            </>
                        ) : null}
                    </>
                ) : null}
            </Box>
        </TabTemplate>
    );
}
