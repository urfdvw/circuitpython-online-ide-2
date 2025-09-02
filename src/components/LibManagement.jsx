import TabTemplate from "../utilComponents/TabTemplate";
import { useContext, useEffect, useState } from "react";
import { AppContext } from "../AppContext";
import { path2Handles, copyEntry } from "../utilComponents/react-local-file-system/utilities/fileSystemUtils";
import { useZipStorage } from "../utilHooks/useZipStorage";
import { useTextStorage } from "../utilHooks/useTextStorage";
import {
    collectPythonTopLevelImports,
    getInstalledLibVersions,
    resolveDependenciesFromJsonStrings,
    filterNamesInJsons,
    compareVersions,
    versionToString,
} from "../utilFunctions/installedLibUtils";
/* ---- util function ---- */

function isBundleJsonFileName(str) {
    const pattern = /^.+-\d{8}\.json$/;
    return pattern.test(str);
}

async function fetchBundleAssets(repo) {
    const response = await fetch(`https://api.github.com/repos/adafruit/${repo}/releases/latest`);
    const data = await response.json();

    return data.assets;
}

function getBundleTimeStamp(assets) {
    return assets.at(0).updated_at;
}

function extractBundleUrls(assets) {
    const result = [];

    for (const asset of assets) {
        const name = asset.name;
        const match = name.match(/^.+-(\d+)\.x-mpy-.*\.zip$/);
        if (match) {
            const version = parseInt(match[1], 10);
            const url = asset.browser_download_url;
            result.push({ version, url });
        }
    }

    return result;
}

/* ---- components ---- */

export default function LibManagement() {
    const { appConfig, rootFolderDirectoryReady, rootDirHandle, boardInfo } = useContext(AppContext);
    const [installedLibs, setInstalledLibs] = useState(null);

    const bundles = [
        {
            repo: "Adafruit_CircuitPython_Bundle",
            json: useTextStorage("jsonAdafruit"),
            zips: {
                // Tech debt: should be more scale able, but not urgent.
                9: useZipStorage("zipAdafruit9"),
                10: useZipStorage("zipAdafruit10"),
                11: useZipStorage("zipAdafruit11"),
            },
            updateDateTime: useTextStorage("updateDateTimeAdafruit"),
            assets: null,
        },
        {
            repo: "CircuitPython_Community_Bundle",
            zips: {
                9: useZipStorage("zipCommunity9"),
                10: useZipStorage("zipCommunity10"),
                11: useZipStorage("zipCommunity11"),
            },
            json: useTextStorage("jsonCommunity"),
            assets: null,
            updateDateTime: useTextStorage("updateDateTimeCommunity"),
        },
    ];

    async function prepareBundle() {
        for (let i = 0; i < bundles.length; i++) {
            try {
                bundles[i].assets = await fetchBundleAssets(bundles[i].repo);
            } catch {
                confirm("Cannot reach online resources!");
                return;
            }

            if (bundles[i].updateDateTime.getText()) {
                const timeStampOnline = getBundleTimeStamp(bundles[i].assets);
                // console.log(timeStampOnline);
                const timeStampCache = bundles[i].updateDateTime.getText();
                // console.log(timeStampCache);
                if (timeStampOnline === timeStampCache) {
                    console.log(`bundle  ${bundles[i].repo} up to date`);
                    continue;
                } else {
                    if (confirm(`New version of ${bundles[i].repo} found, you want to upgrade?`)) {
                        console.log("start downloading bundle to cache");
                    } else {
                        console.log("canceled download. Using cached bundle");
                        continue;
                    }
                }
            } else {
                console.log("no time stamp found, start downloading bundle to cache");
            }

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
        console.log(
            bundles.map((bundle) => {
                const out = [];
                for (var key in bundle.zips) {
                    out.push([key, bundle.zips[key].zipContents]);
                }
                return out;
            })
        );
        console.log(bundles);
    }

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
        console.log(bundleJsons);
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

    const menuStructure = [
        {
            label: "tests",
            options: [
                {
                    text: "test prepareBundle",
                    handler: prepareBundle,
                },
                {
                    text: "test prepareMcu",
                    handler: prepareMcu,
                },
                {
                    text: "test autoInstall",
                    handler: autoInstall,
                },
            ],
        },
    ];

    return <TabTemplate menuStructure={menuStructure} title="Library Management"></TabTemplate>;
}
