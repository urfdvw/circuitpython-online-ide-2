import TabTemplate from "../utilComponents/TabTemplate";
import { useContext, useEffect, useState, useRef } from "react";
import { AppContext } from "../AppContext";
import PagedLibCards from "./PagedLibCards";
import {
    Typography,
    Box,
    Divider,
    Button,
    Backdrop,
    CircularProgress,
    LinearProgress,
    Slide,
} from "@mui/material";

import RowItem from "../utilComponents/RowItem";
import { selectTabById } from "../layout/layoutUtils";
import NewWindow from "react-new-window";
import { useBoardGuard } from "../hooks/useBoardGuard";
import { useBundles } from "../hooks/useBundles";
import { useInstalledLibs } from "../hooks/useInstalledLibs";
import { useLibInstaller } from "../hooks/useLibInstaller";

function useNotification() {
    const [notificationVisible, setNotificationVisible] = useState(false);
    const [notificationText, setNotificationText] = useState("");
    const timeoutRef = useRef(null);

    function notify(text) {
        setNotificationText(text);
        setNotificationVisible(true);

        // clear any previous timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // create new timeout
        timeoutRef.current = setTimeout(() => {
            setNotificationVisible(false);
            timeoutRef.current = null; // cleanup
        }, 3000);
    }

    return { notificationVisible, notificationText, notify };
}

export default function LibManagement() {
    const { appConfig, rootDirHandle, boardInfo, flexModel, helpTabSelection, configTabSelection, batchFileOps, fileSourceNeeds, fileSource } =
        useContext(AppContext);

    const { notificationVisible, notificationText, notify } = useNotification();
    const { requireBoard, boardGuardDialog } = useBoardGuard();

    const cpyMajor = boardInfo?.cpy_version?.major ?? null;
    const useCommunity = appConfig.config.lib_management.use_community_bundle;

    // Bundles: assets, cache, readiness, board-only download (logic in the hook)
    const {
        bundles,
        bundlesReady,
        bundlesError,
        boardCpySupported,
        assertBundleForBoard,
        downloadBundles,
        downloadingBundleInfo,
        getBundleVersionDiff,
    } = useBundles({ cpyMajor, useCommunity });

    // Installed-lib reader + install/uninstall orchestration (logic in the hooks)
    const { getInstalled } = useInstalledLibs(rootDirHandle, batchFileOps);
    const { libCards, refreshCards, autoInstall, installationLog, libChangeInfo } = useLibInstaller({
        bundles,
        bundlesReady,
        boardCpySupported,
        assertBundleForBoard,
        cpyMajor,
        rootDirHandle,
        getInstalled,
        batchFileOps,
        requireBoard,
        notify,
        appConfig,
    });

    // refresh the card list once bundles + a supported board are ready
    useEffect(() => {
        if (boardCpySupported && bundlesReady !== 0) {
            refreshCards();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bundlesReady, boardCpySupported]);

    /* ---- UI state ---- */
    const [popped, setPopped] = useState(false);
    const [hideUpgrade, setHideUpgrade] = useState(false);

    // Downloading from the web must NOT block the UI; only file changes (install/
    // uninstall/auto) do, via the Backdrop below.
    const downloadInfo = downloadingBundleInfo();

    // Downloads need the board's CPy version, so guard before fetching. A rejected
    // download (no board version, wrong-version asset, network failure) is reported
    // instead of becoming an unhandled rejection.
    async function handleDownload() {
        if (!requireBoard()) {
            return;
        }
        try {
            await downloadBundles();
        } catch (e) {
            notify(e?.message || "Failed to download the library bundles");
        }
    }

    const menuStructure = [
        {
            label: "≡",
            options: [
                {
                    text: "Refresh Library List",
                    handler: refreshCards,
                },
                {
                    text: "Show Installation Log",
                    handler: () => {
                        setPopped(true);
                    },
                },
                hideUpgrade && {
                    text: "Download Bundle",
                    handler: handleDownload,
                },
                {
                    text: "Settings",
                    handler: () => {
                        selectTabById(flexModel, "settings_tab");
                        configTabSelection.setTabName("lib_management");
                    },
                },
                {
                    text: "Help",
                    handler: () => {
                        selectTabById(flexModel, "help_tab");
                        helpTabSelection.setTabName("lib_management");
                    },
                },
            ].filter((x) => x),
        },
    ];

    const btnRow1 =
        bundlesReady === 1 ? (
            false
        ) : (
            <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <Button size="small" variant="outlined" onClick={handleDownload}>
                    {bundlesReady === 0 ? "Download" : "Upgrade"}
                </Button>
                {bundlesReady !== 0 && (
                    <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                            setHideUpgrade(true);
                        }}
                    >
                        Hide
                    </Button>
                )}
            </Box>
        );

    return (
        <TabTemplate menuStructure={menuStructure} title="Library Management">
            {boardGuardDialog}
            <Slide in={notificationVisible} mountOnEnter unmountOnExit>
                <Box sx={{ position: "absolute", top: "20%", left: "50%" }}>
                    <Box
                        sx={{
                            transform: "translateX(-50%)",
                            transformOrigin: "center",
                        }}
                    >
                        <Button variant="contained" onClick={() => setPopped(true)}>
                            {notificationText}
                        </Button>
                    </Box>
                </Box>
            </Slide>
            {popped && (
                <NewWindow
                    title={"Installation Log"}
                    onUnload={() => {
                        setPopped(false);
                    }}
                >
                    <Box sx={{ height: "100%", width: "100%", overflow: "auto" }}>
                        <pre>{installationLog}</pre>
                    </Box>
                </NewWindow>
            )}
            {/* File changes block the UI; downloads do not (see inline progress below). */}
            <Backdrop
                sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
                open={libChangeInfo.length > 0}
            >
                <Box sx={{ display: "flex", flexDirection: "row", gap: "10px" }}>
                    <CircularProgress color="inherit" />
                    <Typography component="p">{libChangeInfo}</Typography>
                    {fileSource === "usb_serial" && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", px: 1 }}>
                            Board files are loaded over USB serial, so this reads and writes them through the REPL. It is much slower than the CIRCUITPY drive and briefly interrupts the running program. Switch “Board file access” in the Navigation tab if you would rather use the drive.
                        </Typography>
                    )}
                </Box>
            </Backdrop>
            <Box
                sx={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    bgcolor: "background.default",
                }}
            >
                {/* Non-blocking bundle-download progress */}
                {downloadInfo && (
                    <Box sx={{ px: 1, py: 0.5 }}>
                        <Typography variant="caption">{downloadInfo}</Typography>
                        <LinearProgress />
                    </Box>
                )}

                {bundlesError && (
                    <Typography variant="body2" color="error" sx={{ px: 1, py: 0.5 }}>
                        {bundlesError}
                    </Typography>
                )}

                {bundlesReady === 1 || hideUpgrade ? (
                    false
                ) : (
                    <RowItem
                        title="Prepare Library Bundles"
                        description={
                            bundlesReady === 1
                                ? ""
                                : bundlesReady === 0
                                ? "Bundle not downloaded"
                                : "Bundle upgrade available\n" + getBundleVersionDiff()
                        }
                        status={bundlesReady}
                        button={btnRow1}
                    />
                )}

                {bundlesReady > 0 && (
                    <>
                        <Divider />
                        {libCards.length === 0 ? (
                            <Typography>{fileSourceNeeds}</Typography>
                        ) : (
                            <Box
                                sx={{
                                    flex: 1,
                                    overflow: "auto",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 1,
                                }}
                            >
                                {boardCpySupported ? (
                                    <PagedLibCards
                                        libCards={libCards}
                                        autoInstallHandler={autoInstall}
                                        itemsPerPage={appConfig.config.lib_management.lib_per_page}
                                    />
                                ) : (
                                    <Typography>
                                        CircuitPython version not supported. Please install the latest version of
                                        CircuitPython on the microcontroller and retry.
                                    </Typography>
                                )}
                            </Box>
                        )}
                    </>
                )}
            </Box>
        </TabTemplate>
    );
}
