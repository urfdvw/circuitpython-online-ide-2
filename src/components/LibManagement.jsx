import TabTemplate from "../utilComponents/TabTemplate";
import { useContext, useEffect, useState, useRef } from "react";
import { AppContext } from "../AppContext";
import {
    path2Handles,
    copyEntry,
    removeEntry,
} from "../utilComponents/react-local-file-system/utilities/fileSystemUtils";
import { useZipStorage } from "../utilHooks/useZipStorage";
import { useTextStorage } from "../utilHooks/useTextStorage";
import {
    collectPythonTopLevelImports,
    getInstalledLibVersions,
    resolveDependenciesFromJsonStrings,
    filterNamesInJsons,
    compareVersions,
    versionToString,
    isBundleJsonFileName,
    fetchBundleAssets,
    getBundleTimeStamp,
    extractBundleUrls,
    sleep,
} from "../utilFunctions/installedLibUtils";
import PagedLibCards from "./PagedLibCards";
import { Typography, Box, Divider, Button, Backdrop, CircularProgress, Slide } from "@mui/material";

import RowItem from "../utilComponents/RowItem";
import { selectTabById } from "../layout/layoutUtils";
import NewWindow from "react-new-window";

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
    const {
        appConfig,
        rootFolderDirectoryReady,
        rootDirHandle,
        boardInfo,
        flexModel,
        helpTabSelection,
        configTabSelection,
    } = useContext(AppContext);

    const { notificationVisible, notificationText, notify } = useNotification();
    const [installationLog, setInstallationLog] = useState("");
    const [popped, setPopped] = useState(false);
    const containerRef = useRef(null);

    /* ---- Step 1: bundles ---- */

    // tech debt: how to make cpy version support more scalable
    const jsonAdafruit = useTextStorage("jsonAdafruit");
    const updateDateTimeAdafruit = useTextStorage("updateDateTimeAdafruit");
    const zipAdafruit9 = useZipStorage("zipAdafruit9");
    const zipAdafruit10 = useZipStorage("zipAdafruit10");
    const zipAdafruit11 = useZipStorage("zipAdafruit11");
    const [assetsAdafruit, setAssetsAdafruit] = useState(null);

    const jsonCommunity = useTextStorage("jsonCommunity");
    const updateDateTimeCommunity = useTextStorage("updateDateTimeCommunity");
    const zipCommunity9 = useZipStorage("zipCommunity9");
    const zipCommunity10 = useZipStorage("zipCommunity10");
    const zipCommunity11 = useZipStorage("zipCommunity11");
    const [assetsCommunity, setAssetsCommunity] = useState(null);

    const bundles = [
        {
            repo: "Adafruit_CircuitPython_Bundle",
            abbr: "Adafruit",
            json: jsonAdafruit,
            zips: {
                9: zipAdafruit9,
                10: zipAdafruit10,
                11: zipAdafruit11,
            },
            updateDateTime: updateDateTimeAdafruit,
            assets: assetsAdafruit,
            setAssets: setAssetsAdafruit,
        },
        {
            repo: "CircuitPython_Community_Bundle",
            abbr: "Community",
            json: jsonCommunity,
            zips: {
                9: zipCommunity9,
                10: zipCommunity10,
                11: zipCommunity11,
            },
            updateDateTime: updateDateTimeCommunity,
            assets: assetsCommunity,
            setAssets: setAssetsCommunity,
        },
    ];

    // useEffect(() => {
    //     console.log(bundles)
    // }, [bundles])

    const [bundlesReady, setBundlesReady] = useState(0);

    async function getBundleState() {
        let lowBundle = 1;
        for (let i = 0; i < bundles.length; i++) {
            const assets = await fetchBundleAssets(bundles[i].repo);
            bundles[i].setAssets(assets);
            if (bundles[i].updateDateTime.getText()) {
                const timeStampOnline = getBundleTimeStamp(assets);
                // console.log(timeStampOnline);
                const timeStampCache = bundles[i].updateDateTime.getText();
                // console.log(timeStampCache);
                if (timeStampOnline === timeStampCache) {
                    console.log("bundle up to date");
                    lowBundle = Math.min(1, lowBundle);
                } else {
                    console.log("bundle upgrade available");
                    lowBundle = Math.min(0.5, lowBundle);
                }
            } else {
                console.log("no bundle yet");
                lowBundle = Math.min(0, lowBundle);
            }
        }
        setBundlesReady(lowBundle);
        console.log("Got assets from git hub");
    }

    useEffect(() => {
        // init bundle states
        try {
            getBundleState();
        } catch {
            confirm("Failed to get assets from git hub. Please connect to internet and retry");
        }
    }, []);

    function downloadingBundleInfo() {
        // function to check if bundle is in the process of downloading
        for (let bundle of bundles) {
            for (let key in bundle.zips) {
                if (bundle.zips[key].preparingZip) {
                    return `Downloading CPY ${key} version of ${bundle.repo}`;
                }
            }
            if (bundle.json.preparingText) {
                return `Downloading content list of ${bundle.repo}`;
            }
        }
        return "";
    }

    async function downloadBundles() {
        console.log(bundles);
        for (let i = 0; i < bundles.length; i++) {
            // download zips
            const zipUrls = extractBundleUrls(bundles[i].assets);
            for (let j = 0; j < zipUrls.length; j++) {
                console.log(`start downloading CPY ${zipUrls[j].version} version of ${bundles[i].repo}`);
                await bundles[i].zips[zipUrls[j].version].downloadZipFromWeb(zipUrls[j].url);
                console.log(`end downloading CPY ${zipUrls[j].version} version of ${bundles[i].repo}`);
            }

            // download json
            const jsonUrl = bundles[i].assets.filter((x) => isBundleJsonFileName(x.name)).at(0).browser_download_url;
            console.log("start downloading json file of " + bundles[i].repo);
            await bundles[i].json.downloadTextFromWeb(jsonUrl);
            console.log("finish downloading json file of " + bundles[i].repo);

            // record time stamp
            bundles[i].updateDateTime.setText(getBundleTimeStamp(bundles[i].assets));
        }
        await getBundleState();
    }

    /* ---- Step 2: Analyze MCU ---- */

    const [boardCpySupported, setBoardCpySupported] = useState(false);

    useEffect(() => {
        if (!boardInfo) {
            setBoardCpySupported(false);
            return;
        }
        if (!(boardInfo.cpy_version.major in bundles[0].zips)) {
            setBoardCpySupported(false);
            return;
        }
        if (!bundles[0].zips[boardInfo.cpy_version.major].zipReady) {
            setBoardCpySupported(false);
            return;
        }
        setBoardCpySupported(true);
    }, [bundles, boardInfo]);

    async function analyzeMcu() {
        if (bundlesReady === 0) {
            confirm("Please download library bundles and retry");
            return;
        }
        if (!rootFolderDirectoryReady) {
            confirm("Please connect microcontroller drive in the IDE and retry");
            return;
        }
        if (!boardCpySupported) {
            confirm(
                "CircuitPython version not supported. Please install the latest version of CircuitPython on the microcontroller and retry."
            );
            return;
        }
        const libFodlerPath = "lib/";
        const { dirHandle: libFolderHandle, fileHandle } = await path2Handles(rootDirHandle, libFodlerPath);
        console.log(libFolderHandle);
        const installedLibs = await getInstalledLibVersions(libFolderHandle);
        console.log(installedLibs);
        console.log("---- Got installed lib names and version ----");
        return installedLibs;
    }

    /* ---- action functions ---- */
    const [libChangeInfo, setLibChangeInfo] = useState("");

    async function uninstallLib(name) {
        name = name.split(".")[0]; // to remove extension if there
        const { dirHandle: libDirHandle, fileHandle } = await path2Handles(rootDirHandle, `lib`);

        // as if it is a folder, if not there, will still success
        try {
            const { dirHandle: folderLib, fileHandle } = await path2Handles(rootDirHandle, `lib/${name}`);
            console.log(folderLib);
            await removeEntry(libDirHandle, folderLib);
        } catch {
            console.log(`failed uninstalled folder lib: ${name}`);
        }

        // as if it is a file, if not there, will still success
        try {
            const { dirHandle, fileHandle: fileLib } = await path2Handles(rootDirHandle, `lib/${name}.mpy`);
            console.log(fileLib);
            await removeEntry(libDirHandle, fileLib);
        } catch {
            console.log(`failed uninstalled file lib: ${name}`);
        }

        const now = new Date().toLocaleTimeString();
        setInstallationLog((cur) => cur + `\n${now.toString()}: uninstalled ${name}`);
    }

    async function batchUninstallLib(pendingLibNames) {
        setLibChangeInfo("Uninstalling libs");
        for (const libName of pendingLibNames) {
            await uninstallLib(libName);
        }
        // refresh card view
        await sleep(1000); // 等待 1 秒
        await refreshCards();
        setLibChangeInfo("");
    }

    async function installLib(name, zip) {
        name = name.split(".")[0]; // to remove extension if there
        setLibChangeInfo(`Installing ${name}`);
        const { dirHandle, fileHandle } = await path2Handles(rootDirHandle, "lib");
        try {
            const folderLib = await zip.getEntryFromCache(`lib/${name}`);
            console.log("trying to install folder", folderLib);
            await copyEntry(folderLib, dirHandle, folderLib.name);
            console.log(`installed folder lib: ${name}`);
        } catch (e) {
            console.error(e); // failed on adafruit_midi
            const fileLib = await zip.getEntryFromCache(`lib/${name}.mpy`);
            console.log("trying to install file", fileLib);
            await copyEntry(fileLib, dirHandle, fileLib.name);
            console.log(`installed file lib: ${name}`);
        }

        const now = new Date().toLocaleTimeString();
        setInstallationLog((cur) => cur + `\n${now.toString()}: installed ${name}`);
        setLibChangeInfo("");
    }

    async function batchInstallLib(pendingLibs) {
        setLibChangeInfo("Installing Libs");
        const installedLibs = await analyzeMcu();
        /* ---- dependencies ---- */
        const bundleZipsOfBoardVersion = bundles.map((bundle) => {
            return bundle.zips[boardInfo.cpy_version.major];
        });
        console.log(bundleZipsOfBoardVersion);
        const bundleJsons = bundles.map((bundle) => bundle.json.getText());
        console.log(bundleJsons.map((b) => JSON.parse(b)));
        const libsWithDependencies = resolveDependenciesFromJsonStrings(bundleJsons, pendingLibs);
        console.log(libsWithDependencies);
        console.log("---- Got required lib + dependency names and versions  ----");
        /* ---- install ---- */
        for (const bundle of bundles) {
            console.log(bundle.repo);
            const needFromBundle = filterNamesInJsons([bundle.json.getText()], libsWithDependencies);
            console.log("need", needFromBundle);
            console.log("installed", installedLibs);

            for (const lib of needFromBundle) {
                const installedLib = installedLibs.filter(
                    (installedLib) => installedLib.name.split(".")[0] === lib.name
                );

                const now = new Date().toLocaleTimeString();
                if (installedLib.length > 0) {
                    if (compareVersions(installedLib[0].version, lib.version) === 0) {
                        console.log(
                            `version of ${lib.name} is the same in bundle and MCU: ${versionToString(lib.version)}`
                        );
                        setInstallationLog(
                            (cur) =>
                                cur +
                                `\n${now.toString()}: version of ${
                                    lib.name
                                } is the same in bundle and MCU: ${versionToString(lib.version)}`
                        );
                    } else {
                        console.log(
                            `version of ${lib.name} is different in bundle and MCU. bundle: ${versionToString(
                                lib.version
                            )}, MCU: ${versionToString(installedLib[0].version)}`
                        );
                        setInstallationLog(
                            (cur) =>
                                cur +
                                `\n${now.toString()}: version of ${
                                    lib.name
                                } is different in bundle and MCU. bundle: ${versionToString(
                                    lib.version
                                )}, MCU: ${versionToString(installedLib[0].version)}`
                        );
                        await installLib(lib.name, bundle.zips[boardInfo.cpy_version.major]);
                    }
                } else {
                    console.log(`${lib.name} is not installed yet`);
                    setInstallationLog((cur) => cur + `\n${now.toString()}: ${lib.name} is not installed yet`);
                    await installLib(lib.name, bundle.zips[boardInfo.cpy_version.major]);
                }
            }
        }
        // refresh card view
        await sleep(1000); // 等待 1 秒
        await refreshCards();
        setLibChangeInfo("");
    }

    /* ---- Cards ---- */
    const [libCards, setLibCards] = useState([]);
    async function refreshCards() {
        const installedLibs = await analyzeMcu();
        const cards = [];
        if (!boardCpySupported) {
            return cards;
        } else {
            for (const bundle of bundles) {
                const bundleObj = JSON.parse(bundle.json.getText());
                for (const bundleLibName in bundleObj) {
                    let installedVersion = null;
                    const installedBundleLib = installedLibs.filter(
                        (lib) => lib.name.split(".")[0] === bundleLibName.split(".")[0]
                    );
                    if (installedBundleLib.length > 0) {
                        installedVersion = installedBundleLib[0].version;
                    }
                    cards.push({
                        repoName: bundle.repo,
                        abbr: bundle.abbr,
                        libObj: bundleObj[bundleLibName],
                        libDisplayName: bundleLibName,
                        installHandler: async () => {
                            await batchInstallLib([bundleLibName]);
                            notify(`Installed ${bundleLibName}`);
                        },
                        uninstallHandler: async () => {
                            await batchUninstallLib([bundleLibName]);
                            notify(`Uninstalled ${bundleLibName}`);
                        },
                        installedVersion: installedVersion,
                    });
                }
            }
        }
        setLibCards(cards);
    }

    useEffect(() => {
        function autoRefreshCards() {
            if (boardCpySupported && bundlesReady !== 0) {
                refreshCards();
            }
        }
        autoRefreshCards();
    }, [bundlesReady, boardCpySupported]);

    /* ---- UI ---- */

    const [hideUpgrade, setHideUpgrade] = useState(false);

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
                    handler: downloadBundles,
                },
                {
                    text: "Settings",
                    handler: () => {
                        console.log("clicked on menu item `Settings`");
                        selectTabById(flexModel, "settings_tab");
                        configTabSelection.setTabName("lib_management");
                    },
                },
                {
                    text: "Help",
                    handler: () => {
                        console.log("clicked on menu item `Help`");
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
                <Button size="small" variant="outlined" onClick={downloadBundles}>
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
    async function clearInstalledLibs() {
        // scan to get required libs
        const installedLibs = await analyzeMcu();
        console.log("---- Got required lib names ----");
        console.log(installedLibs);
        // uninstall
        await batchUninstallLib(installedLibs.map((lib) => lib.name));
    }

    async function autoInstall() {
        let now = new Date().toLocaleTimeString();
        setInstallationLog((cur) => cur + `\n${now.toString()}: auto install started`);
        // clear
        if (appConfig.config.lib_management.clean_up_in_auto) {
            now = new Date().toLocaleTimeString();
            setInstallationLog((cur) => cur + `\n${now.toString()}: clean up before installation`);
            await clearInstalledLibs();
        }
        // scan to get required libs
        const scannedLibs = await collectPythonTopLevelImports(rootDirHandle);
        console.log("---- Got required lib names ----");
        console.log(scannedLibs);
        // install
        await batchInstallLib(scannedLibs);

        notify("Auto install finished");
        now = new Date().toLocaleTimeString();
        setInstallationLog((cur) => cur + `\n${now.toString()}: auto install finished`);
    }

    const loadingInfo = downloadingBundleInfo() + libChangeInfo;

    function getBundleVersionDiff() {
        return bundles
            .map((bundle) => {
                const bundleTime = getBundleTimeStamp(bundle.assets).split("T")[0];
                const installedTime = bundle.updateDateTime.getText().split("T")[0];
                if (bundleTime != installedTime) {
                    return `${bundle.abbr}: ${installedTime} -> ${bundleTime}`;
                } else {
                    return null;
                }
            })
            .filter((x) => x)
            .join("\n");
    }

    return (
        <TabTemplate menuStructure={menuStructure} title="Library Management">
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
            <Backdrop sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }} open={loadingInfo.length > 0}>
                <Box sx={{ display: "flex", flexDirection: "row", gap: "10px" }}>
                    <CircularProgress color="inherit" />
                    <Typography component="p">{loadingInfo}</Typography>
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
                            <Typography>Please open CIRCUITPY drive</Typography>
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
