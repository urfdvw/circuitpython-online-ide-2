import TabTemplate from "../utilComponents/TabTemplate";
import { useContext, useEffect, useState, useMemo, useCallback } from "react";
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
} from "../utilFunctions/installedLibUtils";
import PagedLibCards from "./PagedLibCards";
import { Typography, Box, Divider, Button } from "@mui/material";

import RowItem from "../utilComponents/RowItem";

/* ---- components ---- */

export default function LibManagement() {
    const { appConfig, rootDirHandle, boardInfo } = useContext(AppContext);
    const [libCards, setLibCards] = useState([]);

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

    function downloadingBundle() {
        for (let bundle of bundles) {
            for (let key in bundle.zips) {
                if (bundle.zips[key].preparingZip) {
                    return true;
                }
            }
        }
        return false;
    }

    async function prepareBundle() {
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

    const [installedLibs, setInstalledLibs] = useState(null);
    async function prepareMcu() {
        if (!boardInfo.cpy_version.major) {
            confirm("Cannot get board CircuitPython version from boot_out.txt!");
            return;
        }
        const libFodlerPath = "lib/";
        const { dirHandle: libFolderHandle, fileHandle } = await path2Handles(rootDirHandle, libFodlerPath);
        console.log(libFolderHandle);
        const installedLibs = await getInstalledLibVersions(libFolderHandle);
        console.log(installedLibs);
        console.log("---- Got installed lib names and version ----");
        setInstalledLibs(installedLibs);
    }

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

    async function uninstallLib(name) {
        name = name.split(".")[0]; // to remove extension if there
        const { dirHandle: libDirHandle, fileHandle } = await path2Handles(rootDirHandle, `lib`);

        // as if it is a folder, if not there, will still success
        try {
            const { dirHandle: folderLib, fileHandle } = await path2Handles(rootDirHandle, `lib/${name}`);
            console.log(folderLib);
            removeEntry(libDirHandle, folderLib);
        } catch {
            console.log(`failed uninstalled folder lib: ${name}`);
        }

        // as if it is a file, if not there, will still success
        try {
            const { dirHandle, fileHandle: fileLib } = await path2Handles(rootDirHandle, `lib/${name}.mpy`);
            console.log(fileLib);
            removeEntry(libDirHandle, fileLib);
        } catch {
            console.log(`failed uninstalled file lib: ${name}`);
        }
    }

    async function batchUninstallLib(pendingLibs) {
        console.log(pendingLibs);
        for (const lib of pendingLibs) {
            await uninstallLib(lib.name);
        }
    }

    async function installLib(name, zip) {
        name = name.split(".")[0]; // to remove extension if there
        const { dirHandle, fileHandle } = await path2Handles(rootDirHandle, "lib");
        try {
            const folderLib = await zip.getEntryFromCache(`lib/${name}`);
            // console.log(folderLib);
            copyEntry(folderLib, dirHandle, folderLib.name);
            console.log(`installed folder lib: ${name}`);
        } catch {
            const fileLib = await zip.getEntryFromCache(`lib/${name}.mpy`);
            // console.log(fileLib);
            copyEntry(fileLib, dirHandle, fileLib.name);
            console.log(`installed file lib: ${name}`);
        }
    }

    async function batchInstallLib(pendingLibs) {
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
                if (installedLib.length > 0) {
                    if (compareVersions(installedLib[0].version, lib.version) === 0) {
                        console.log(
                            `version of ${lib.name} is the same in bundle and MCU: ${versionToString(lib.version)}`
                        );
                    } else {
                        console.log(
                            `version of ${lib.name} is different in bundle and MCU. bundle: ${versionToString(
                                lib.version
                            )}, MCU: ${versionToString(installedLib[0].version)}`
                        );
                        installLib(lib.name, bundle.zips[boardInfo.cpy_version.major]);
                    }
                } else {
                    console.log(`${lib.name} is not installed yet`);
                    installLib(lib.name, bundle.zips[boardInfo.cpy_version.major]);
                }
            }
        }
    }

    async function autoInstall() {
        const scannedLibs = await collectPythonTopLevelImports(rootDirHandle);
        console.log(scannedLibs);
        console.log("---- Got required lib names ----");
        batchInstallLib(scannedLibs);
    }

    function getCard() {
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
                        installHandler: () => {
                            batchInstallLib([bundleLibName]);
                        },
                        uninstallHandler: () => {
                            uninstallLib(bundleLibName);
                        },
                        installedVersion: installedVersion,
                    });
                }
            }
        }
        return cards;
    }

    const menuStructure = [
        {
            label: "tests",
            options: [
                {
                    text: "test autoInstall (refresh first)",
                    handler: autoInstall,
                },
                {
                    text: "test clean up (refresh first)",
                    handler: () => {
                        batchUninstallLib(installedLibs);
                    },
                },
                {
                    text: "test get card",
                    handler: () => {
                        const card = getCard();
                        setLibCards(card);
                        console.log(card);
                    },
                },
            ],
        },
    ];
    const btnRow1 = downloadingBundle() ? (
        <Typography>downloading</Typography>
    ) : bundlesReady === 1 ? (
        false
    ) : (
        <Button size="small" variant="outlined" onClick={prepareBundle}>
            {bundlesReady === 0 ? "Download" : "Upgrade"}
        </Button>
    );
    const btnRow2 = (
        <Button size="small" variant="outlined">
            Details
        </Button>
    );

    return (
        <TabTemplate menuStructure={menuStructure} title="Library Management">
            <Box
                sx={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    bgcolor: "background.default",
                }}
            >
                {/* Row 1 (auto height) */}
                <RowItem
                    title="Step 1: Prepare Bundles"
                    description={
                        bundlesReady === 1
                            ? ""
                            : bundlesReady === 0
                            ? "Bundle not downloaded"
                            : "Bundle upgrade available"
                    }
                    status={bundlesReady}
                    button={btnRow1}
                />
                {bundlesReady === 0 ? null : (
                    <>
                        <Divider />

                        {/* Row 2 (auto height) */}
                        <RowItem
                            title="Placeholder Title • Row 2"
                            // no description -> falls back to single-row middle column
                            status={0.5}
                            button={btnRow2}
                        />

                        <Divider />

                        {/* Row 3 (fills remaining space) */}
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
                                <PagedLibCards libCards={libCards} autoInstallHandler={autoInstall} />
                            ) : (
                                "not ready"
                            )}
                        </Box>
                    </>
                )}
            </Box>
        </TabTemplate>
    );
}
