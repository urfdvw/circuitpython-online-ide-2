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
import { collectPythonTopLevelImports, getInstalledLibVersions } from "../utilFunctions/installedLibUtils";

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

function resolveDependencies(data, targetName) {
    const visited = new Set();

    function dfs(name) {
        if (!data[name] || visited.has(name)) return;
        visited.add(name);
        const deps = data[name].dependencies || [];
        const externals = data[name].external_dependencies || [];
        for (const dep of [...deps, ...externals]) {
            dfs(dep);
        }
    }

    dfs(targetName);
    return Array.from(visited);
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
        // assumption is that Adafruit will only maintain 2 cpy versions of bundle, will break if that is not the case.
        {
            repo: "Adafruit_CircuitPython_Bundle",
            zipLow: useZipStorage("zipLowAdafruit"),
            zipHigh: useZipStorage("zipHighAdafruit"),
            json: useTextStorage("jsonAdafruit"),
            assets: null,
            cpyVersion: {
                high: null,
                low: null,
            },
        },
        {
            repo: "CircuitPython_Community_Bundle",
            zipLow: useZipStorage("zipLowCommunity"),
            zipHigh: useZipStorage("zipHighCommunity"),
            json: useTextStorage("jsonCommunity"),
            assets: null,
            cpyVersion: {
                high: null,
                low: null,
            },
        },
    ];

    const menuStructure = [
        {
            text: "now testing",
            handler: async () => {
                /* ---- prepare ---- */
                console.log(boardInfo);
                for (let i = 0; i < bundles.length; i++) {
                    try {
                        bundles[i].assets = await fetchBundleAssets(bundles[i].repo);
                    } catch {
                        confirm("Cannot reach online resources!");
                        return
                    }

                    // download zips
                    const zipUrls = extractBundleUrls(bundles[i].assets);
                    let indexHigh;
                    let indexLow;
                    if (zipUrls[0].version > zipUrls[1].version) {
                        indexHigh = 0;
                        indexLow = 1;
                    } else {
                        indexHigh = 1;
                        indexLow = 0;
                    }
                    bundles[i].cpyVersion.high = zipUrls[indexHigh].version;
                    bundles[i].cpyVersion.low = zipUrls[indexLow].version;

                    await bundles[i].zipHigh.downloadZipFromWeb(zipUrls[indexHigh].url);
                    console.log("finish downloading higher version of " + bundles[i].repo);
                    await bundles[i].zipLow.downloadZipFromWeb(zipUrls[indexLow].url);
                    console.log("finish downloading lower version of " + bundles[i].repo);

                    // download json
                    const jsonUrl = bundles[i].assets
                        .filter((x) => isBundleJsonFileName(x.name))
                        .at(0).browser_download_url;
                    await bundles[i].json.downloadTextFromWeb(jsonUrl);
                    console.log("finish downloading json file of " + bundles[i].repo);
                }
                console.log(bundles);
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
                        console.log(resolveDependencies(combinedBundle, "adafruit_74hc595"));

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
