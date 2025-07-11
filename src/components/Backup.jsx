import TabTemplate from "../utilComponents/TabTemplate";
import AppContext from "../AppContext";
import { useContext, useEffect, useState, useCallback } from "react";
import { Typography, Box, Button } from "@mui/material";
import TextDiffViewer from "../utilComponents/TextDiffViewer"
import { selectTabById } from "../layout/layoutUtils";


import { backupFolder, compareFolders } from "../utilComponents/react-local-file-system";

export default function Backup() {
    const {
        flexModel,
        appConfig,
        openBackupDirectory,
        backupFolderDirectoryReady,
        backupFolderStatusText,
        backupDirHandle,
        openDirectory,
        rootFolderDirectoryReady,
        rootDirHandle,
        helpTabSelection,
        configTabSelection,
    } = useContext(AppContext);
    const [lastBackupTime, setLastBackupTime] = useState(null);
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
        const diff = await compareFolders(
            rootDirHandle, backupDirHandle)
        setCodeDiff(diff)
    })

    const backup = useCallback(async (toPC) => {
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
        if (toPC) {
            await backupFolder(rootDirHandle, backupDirHandle, appConfig.ready && appConfig.config.backup.clean);
        } else {
            await backupFolder(backupDirHandle, rootDirHandle, appConfig.ready && appConfig.config.backup.clean);
        }
        const now = new Date().toLocaleTimeString();
        setLastBackupTime(now);
        console.log("Last backup at: " + now);
    }, [backupDirHandle, rootDirHandle, appConfig.ready, appConfig.config.backup.clean]);

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
        {
            label: "Sync",
            options: [

                {
                    text: "Backup to Computer",
                    handler: () => {
                        const isConfirmed = window.confirm('Backup to Computer?');
                        if (isConfirmed) {
                            backup(true)
                            console.log('Action was confirmed and executed.');
                        } else {
                            console.log('Action was cancelled by the user.');
                        }
                    },
                },
                {
                    text: "Recover from Computer",
                    handler: () => {
                        const isConfirmed = window.confirm('Recover from Computer?');
                        if (isConfirmed) {
                            backup(false)
                            console.log('Action was confirmed and executed.');
                        } else {
                            console.log('Action was cancelled by the user.');
                        }
                    },
                },
            ]
        },
        {
            text: codeDiff ? "Refresh Diff" : "View Diff",
            handler: refresh,
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
        }
    ].filter((x) => x);

    return (
        <TabTemplate title="Backup" menuStructure={menuStructure}>
            <Box sx={{ width: "100%", height: "100%", padding: "0px", margin: "0px" }}>
                <Typography gutterBottom>
                    Microcontroller Folder:{" "}
                    <Button onClick={openDirectory}>
                        {rootFolderDirectoryReady ? rootDirHandle.name : "Open Source Folder"}
                    </Button>
                    {rootFolderDirectoryReady ? "✅" : ""}
                </Typography>
                <Typography gutterBottom>
                    Computer Folder:{" "}
                    <Button onClick={openBackupDirectory}>
                        {backupFolderDirectoryReady ? backupDirHandle.name : "Open Target Folder"}
                    </Button>
                    {backupFolderDirectoryReady ? "✅" : ""}
                </Typography>
                <Typography gutterBottom>Last Backup : {lastBackupTime ? lastBackupTime : "No backup yet"}</Typography>
                {
                    codeDiff ? <>
                        {codeDiff.newFiles ? <>
                            <hr></hr>
                            <Typography variant="h6">Files only on microcontroller</Typography>
                            {[
                                codeDiff.newFiles.map(file => <Box>
                                    <Typography>
                                        {file.path}
                                        <TextDiffViewer
                                            oldText=''
                                            newText={file.text}
                                        />
                                    </Typography>
                                </Box>)
                            ]}
                        </> : null
                        }
                        {codeDiff.removedFiles ? <>
                            <hr></hr>
                            <Typography variant="h6">Files only on compouter</Typography>
                            {[
                                codeDiff.removedFiles.map(file => <Box>
                                    <Typography>
                                        {file.path}
                                        <TextDiffViewer
                                            oldText={file.text}
                                            newText=''
                                        />
                                    </Typography>
                                </Box>)
                            ]}
                        </> : null
                        }
                        {
                            codeDiff.editedFiles ? <>
                                <hr></hr>
                                <Typography variant="h6">Edited Files</Typography>
                                {[
                                    codeDiff.editedFiles.map(file => <Box>
                                        <Typography>
                                            {file.path}
                                            <TextDiffViewer
                                                oldText={file.sourceFileText}
                                                newText={file.targetFileText}
                                            />
                                        </Typography>
                                    </Box>)
                                ]}
                            </> : null
                        }
                    </> : null
                }
            </Box>
        </TabTemplate>
    );
}
