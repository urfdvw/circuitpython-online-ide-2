import TabTemplate from "../utilComponents/TabTemplate";
import { useContext, useEffect } from "react";
import { AppContext } from "../AppContext";
import {
    getFromPath,
    checkFileExists,
    path2Handles,
    copyEntry,
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
} from "../utilFunctions/installedLibUtils";

const BUNDLE_REPOS = ["Adafruit_CircuitPython_Bundle", "CircuitPython_Community_Bundle"];

async function fetchWithProxy(targetUrl) {
    // 已部署的 Cloud Run 代理端点
    const PROXY_ENDPOINT = "https://cpy-lib-proxy-663297601284.us-central1.run.app";

    // 发起请求（代理会加上 Access-Control-Allow-Origin 头，消除 CORS）
    const resp = await fetch(`${PROXY_ENDPOINT}?url=${encodeURIComponent(targetUrl)}`);

    if (!resp.ok) {
        throw new Error(`Failed to fetch: ${resp.status} ${resp.statusText}`);
    }

    return resp;
}

function isBundleJsonFileName(str) {
    const pattern = /^.+-\d{8}\.json$/;
    return pattern.test(str);
}

async function fetchBundleAssets(repo) {
    const response = await fetch(`https://api.github.com/repos/adafruit/${repo}/releases/latest`);
    const data = await response.json();

    return data.assets;
}

async function fetchBundleJsonContent(assets) {
    const targetUrl = assets.filter((x) => isBundleJsonFileName(x.name)).at(0).browser_download_url;
    // console.log(targetUrl);
    const resp = await fetchWithProxy(targetUrl);
    const text = await resp.text();
    // console.log(text);
    const bundle = JSON.parse(text);
    return bundle;
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

export default function LibManagement() {
    const { appConfig, rootFolderDirectoryReady, rootDirHandle, boardInfo } = useContext(AppContext);
    const {
        downloadZipFromWeb,
        uploadZipFromLocal,
        getEntryFromCache,
        clearZipCache,
        preparingZip,
        zipReady,
        zipContents,
    } = useZipStorage("testDb");
    const { downloadTextFromWeb, uploadTextFromLocal, getText, clearTextCache, preparingText, textReady } =
        useTextStorage("testText");

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

    async function downloadAll() {
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
                        console.log("User clicked OK");
                    } else {
                        console.log("User clicked Cancel");
                        continue;
                    }
                }
            } else {
                console.log("no time stamp found");
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

    async function installLib(name, zip) {
        const { dirHandle, fileHandle } = await path2Handles(rootDirHandle, "lib");
        try {
            const folderLib = await zip.getEntryFromCache(`lib/${name}`);
            console.log(folderLib);
            copyEntry(folderLib, dirHandle, folderLib.name);
            console.log(`installed folder lib: ${name}`);
        } catch {
            const fileLib = await zip.getEntryFromCache(`lib/${name}.mpy`);
            console.log(fileLib);
            copyEntry(fileLib, dirHandle, fileLib.name);
            console.log(`installed file lib: ${name}`);
        }
    }

    const menuStructure = [
        {
            text: "now testing",
            handler: async () => {
                /* ---- prepare bundles ---- */
                console.log(boardInfo);
                await downloadAll();
                console.log("---- Libs are ready in cache ----");
                /* ---- prepare mcu ---- */
                const libFodlerPath = "lib/";
                const { dirHandle: libFolderHandle, fileHandle } = await path2Handles(rootDirHandle, libFodlerPath);
                console.log(libFolderHandle);
                const installedLibs = await getInstalledLibVersions(libFolderHandle);
                console.log(installedLibs);
                console.log("---- Got installed lib names and version ----");
                const scannedLibs = await collectPythonTopLevelImports(rootDirHandle);
                console.log(scannedLibs);
                console.log("---- Got required lib names ----");
                /* ---- dependencies ---- */
                const bundleZipsOfBoardVersion = bundles.map((bundle) => {
                    return bundle.zips[boardInfo.cpy_version.major];
                });
                console.log(bundleZipsOfBoardVersion);
                const bundleJsons = bundles.map((bundle) => bundle.json.getText());
                console.log(bundleJsons);
                const dependenciesOfScanned = resolveDependenciesFromJsonStrings(bundleJsons, scannedLibs);
                console.log(dependenciesOfScanned);
                console.log("---- Got required lib + dependency names and versions  ----");
                /* ---- install ---- */
                for (const bundle of bundles) {
                    console.log(bundle.repo);
                    const needFromBundle = filterNamesInJsons([bundle.json.getText()], dependenciesOfScanned);
                    console.log("need", needFromBundle);
                    console.log("installed", installedLibs);

                    for (const lib of needFromBundle) {
                        const installedLib = installedLibs.filter(
                            (installedLib) => installedLib.name.split(".")[0] === lib.name
                        );
                        if (installedLib.length > 0) {
                            if (compareVersions(installedLib[0].version, lib.version) === 0) {
                                console.log(
                                    `version of ${lib.name} is the same in bundle and MCU: ${versionToString(
                                        lib.version
                                    )}`
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

                console.log("done");
            },
        },
        {
            label: "tests",
            options: [
                {
                    text: "test getInstalledLibVersions",
                    handler: async () => {},
                },
                {
                    text: "test collectPythonTopLevelImports",
                    handler: async () => {
                        const scannedLibs = await collectPythonTopLevelImports(rootDirHandle);
                        console.log(scannedLibs);
                    },
                },
                {
                    text: "test download files",
                    handler: async () => {
                        const bundleAssets = await Promise.all(
                            BUNDLE_REPOS.map(async (repo) => {
                                const assets = await fetchBundleAssets(repo); // was using bundleRepos[0] incorrectly
                                console.log(assets);
                                return assets;
                            })
                        );
                        console.log(bundleAssets);

                        const bundleList = await Promise.all(
                            bundleAssets.map(async (assets) => {
                                const bundle = await fetchBundleJsonContent(assets);
                                return bundle;
                            })
                        );

                        const combinedBundle = Object.assign({}, ...bundleList);
                        // console.log(resolveDependencies(combinedBundle, "adafruit_74hc595"));

                        const bundleTimeStamps = bundleAssets.map((assets) => getBundleTimeStamp(assets));
                        console.log(bundleTimeStamps);

                        const bundleZipUrls = bundleAssets.map((assets) => extractBundleUrls(assets));
                        console.log(bundleZipUrls);

                        await downloadZipFromWeb(bundleZipUrls[0][0].url);

                        const jsonUrl = bundleAssets[0]
                            .filter((x) => isBundleJsonFileName(x.name))
                            .at(0).browser_download_url;

                        console.log(jsonUrl);
                        await downloadTextFromWeb(jsonUrl);
                        console.log("end");
                    },
                },
                {
                    text: "test zip: uploadZipFromLocal",
                    handler: uploadZipFromLocal,
                },
                {
                    text: "test zip: getEntryFromCache",
                    handler: async () => {
                        const handle = await getEntryFromCache("VERSIONS.txt");
                        const file = await handle.getFile();
                        const text = await file.text();
                        console.log([text]);
                    },
                },
                { text: "test zip: clearZipCache", handler: clearZipCache },
                {
                    text: "test zip: copy file from cache to MCU",
                    handler: async () => {
                        const { dirHandle, fileHandle } = await path2Handles(rootDirHandle, "lib");

                        const folderLib = await getEntryFromCache("lib/adafruit_espatcontrol");
                        console.log(folderLib);
                        copyEntry(folderLib, dirHandle, folderLib.name);

                        const fileLib = await getEntryFromCache("lib/adafruit_usb_host_mouse.mpy");
                        console.log(fileLib);
                        copyEntry(fileLib, dirHandle, fileLib.name);
                    },
                },
                {
                    text: "test text: uploadTextFromLocal",
                    handler: uploadTextFromLocal,
                },
                {
                    text: "test text: getText",
                    handler: () => {
                        const text = getText();
                        console.log([text]);
                    },
                },
                { text: "test text: clearTextCache", handler: clearTextCache },
                {
                    text: "test prepare",
                    handler: async () => {
                        console.log(boardInfo);
                        const bundleAssets = await Promise.all(
                            BUNDLE_REPOS.map(async (repo) => {
                                const assets = await fetchBundleAssets(repo); // was using bundleRepos[0] incorrectly
                                console.log(assets);
                                return assets;
                            })
                        );
                        console.log(bundleAssets);
                        const bundleList = await Promise.all(
                            bundleAssets.map(async (assets) => {
                                const bundle = await fetchBundleJsonContent(assets);
                                return bundle;
                            })
                        );
                        console.log(bundleList);
                    },
                },
            ],
        },
    ];

    return (
        <TabTemplate menuStructure={menuStructure} title="Library Management">
            {preparingText ? "text downloading" : "text not downloading"}
            <br />
            {textReady ? getText() : "no text"}
            <hr />
            {preparingZip ? "zip downloading" : "zip not downloading"}
            <br />
            {zipReady ? zipContents.join("\n") : "no files"}
        </TabTemplate>
    );
}
