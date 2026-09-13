import useBackupJob from "../hooks/useBackupJob";
import TabTemplate from "../utilComponents/TabTemplate";
import AppContext from "../AppContext";
import { useContext, useEffect, useState, useCallback } from "react";
import { Typography, Box, Button } from "@mui/material";
import TextDiffViewer from "../utilComponents/TextDiffViewer";
import { selectTabById } from "../layout/layoutUtils";

import { backupFolder, compareFolders, isSameEntrySafe } from "../utilComponents/react-local-file-system";

export default function Backup() {
    const {
        flexModel,
        appConfig,
        openBackupDirectory,
        backupFolderDirectoryReady,
        backupDirHandle,
        backupRestoreWarning,
        backupReconnectName,
        reconnectBackupDirectory,
        openDirectory,
        rootFolderDirectoryReady,
        rootDirHandle,
        helpTabSelection,
        configTabSelection,
        autoWatchFiles,
        batchFileOps,
        fileSource,
    } = useContext(AppContext);
    const [lastBackupTime, setLastBackupTime] = useState(null);
    const [lastRecoverTime, setLastRecoverTime] = useState(null);
    const [lastRefreshTime, setLastRefreshTime] = useState(null);
    const [codeDiff, setCodeDiff] = useState(null);
    const { runJob, error: jobError, clearError } = useBackupJob();

    useEffect(() => {
        clearError();
        setCodeDiff(null);
        setLastBackupTime(null);
        setLastRecoverTime(null);
        setLastRefreshTime(null);
    }, [rootDirHandle, backupDirHandle, clearError]);
    useEffect(() => {
        if (!backupFolderDirectoryReady) {
            setLastBackupTime(null);
        }
    }, [backupFolderDirectoryReady]);

    const refresh = useCallback((options) => runJob(async () => {
        if (!(backupDirHandle && rootDirHandle)) {
            return;
        }
        // compareFolders reads every file in both trees. Over serial that is a
        // round trip each; batching keeps it to one interruption of the board.
        const diff = await batchFileOps(
            (root) => compareFolders(root, backupDirHandle),
            { label: "compared board with backup folder" }
        );
        setCodeDiff(diff);

        const now = new Date().toLocaleTimeString();
        setLastRefreshTime(now);
        console.log("Last refresh at: " + now);
    }, options), [backupDirHandle, rootDirHandle, batchFileOps, runJob]);

    const backup = useCallback(
        (toPC, options) => runJob(async () => {
            if (await isSameEntrySafe(backupDirHandle, rootDirHandle)) {
                console.log(backupDirHandle.name);
                console.log(rootDirHandle.name);
                console.error("Cannot backup to the folder itself.");
                throw new Error("Cannot back up a folder to itself.");
            }
            if (!(backupDirHandle && rootDirHandle)) {
                return;
            }
            const now = new Date().toLocaleTimeString();
            const clean = appConfig.ready && appConfig.config.backup.clean;
            // Copying a whole board is one round trip per file over serial, so
            // the copy runs as a single session rather than interrupting the
            // board once per file.
            if (toPC) {
                await batchFileOps((root) => backupFolder(root, backupDirHandle, clean), {
                    label: "copied board to the backup folder",
                });
                setLastBackupTime(now);
                console.log("Last backup at: " + now);
            } else {
                await batchFileOps((root) => backupFolder(backupDirHandle, root, clean), {
                    label: "restored board from the backup folder",
                });
                setLastRecoverTime(now);
                console.log("Last recover at: " + now);
            }
        }, options),
        [backupDirHandle, rootDirHandle, appConfig.ready, appConfig.config.backup.clean, batchFileOps, runJob]
    );

    // Scheduled backup copies every file on the board. Over serial that is a raw
    // REPL read per file, so the schedules are limited to the mass-storage source.
    // The manual buttons still work in either mode, because the user asked for it.
    useEffect(() => {
        const period = Number(appConfig.config.backup.backup_period);
        if (!autoWatchFiles || !appConfig.ready || !appConfig.config.backup.enable_backup_schedule ||
            !Number.isFinite(period) || period <= 0) return;
        const interval = setInterval(() => backup(true, { background: true }), 60000 * period);
        return () => clearInterval(interval);
    }, [
        backup,
        autoWatchFiles,
        appConfig.ready,
        appConfig.config.backup.enable_backup_schedule,
        appConfig.config.backup.backup_period,
    ]);

    // Same reasoning: refresh() runs compareFolders, which reads every file in
    // both trees to diff them by content.
    useEffect(() => {
        const period = Number(appConfig.config.backup.refresh_period);
        if (!autoWatchFiles || !appConfig.ready || !appConfig.config.backup.enable_refresh_schedule ||
            !Number.isFinite(period) || period <= 0) return;
        const interval = setInterval(() => refresh({ background: true }), 60000 * period);
        return () => clearInterval(interval);
    }, [
        refresh,
        autoWatchFiles,
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
                            if (await backup(true)) await refresh();
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
                            if (await backup(false)) await refresh();
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
            {fileSource === "usb_serial" && (
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", p: 1 }}>
                    Board files are loaded over USB serial, so this reads and writes them through the REPL. It is much slower than the CIRCUITPY drive and briefly interrupts the running program. Switch “Board file access” in the Navigation tab if you would rather use the drive.
                </Typography>
            )}
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

                {backupReconnectName && !backupFolderDirectoryReady ? (
                    <Typography gutterBottom>
                        This board has a saved backup folder &quot;{backupReconnectName}&quot;.{" "}
                        <Button onClick={reconnectBackupDirectory}>Reconnect</Button>
                    </Typography>
                ) : null}

                {backupRestoreWarning ? (
                    <Typography gutterBottom color="warning.main">
                        The saved backup folder &quot;{backupRestoreWarning}&quot; could not be opened (it may have been
                        moved, deleted, or its drive disconnected). Please connect a new backup folder using
                        &quot;Computer Folder&quot; above.
                    </Typography>
                ) : null}

                {jobError && <Typography role="status" color="error">{jobError}</Typography>}
                {lastBackupTime || lastRecoverTime || lastRefreshTime ? <hr /> : null}
                {lastBackupTime ? <Typography gutterBottom>Last Backup : {lastBackupTime}</Typography> : null}
                {lastRecoverTime ? <Typography gutterBottom>Last Recover : {lastRecoverTime}</Typography> : null}
                {lastRefreshTime ? <Typography gutterBottom>Last Refresh : {lastRefreshTime}</Typography> : null}

                {codeDiff ? (
                    <>
                        <hr />
                        {!codeDiff.complete && (
                            <Box role="status" sx={{ color: "warning.main" }}>
                                <Typography>Comparison incomplete. These paths could not be read and are excluded from the differences below:</Typography>
                                {codeDiff.unreadable.map((entry) => (
                                    <Typography key={entry.side + entry.path}>
                                        {entry.side === "source" ? "Microcontroller" : "Computer"}: {entry.path} — {entry.message}
                                    </Typography>
                                ))}
                            </Box>
                        )}
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
                                <Typography variant="h6">Files only on computer</Typography>
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
