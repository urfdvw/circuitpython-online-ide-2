import TabTemplate from "../utilComponents/TabTemplate";
import { useContext, useEffect } from "react";
import { AppContext } from "../AppContext";
import {
    getFromPath,
    checkFileExists,
    path2Handles,
} from "../utilComponents/react-local-file-system/utilities/fileSystemUtils";
import { collectPythonTopLevelImports } from "../utilFunctions/fileSysUtils";

import { useZipStorage } from "../utilHooks/useZipStorage";
import { useTextStorage } from "../utilHooks/useTextStorage";
import { extractLibFileMetadata } from "../utilFunctions/installedLibUtils";

const BUNDLE_REPOS = ["Adafruit_CircuitPython_Bundle", "CircuitPython_Community_Bundle"];

async function getInstalledLibs(rootDirHandle) {
    // todo: use circup like mpy content scan
}

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

function isCircuitPythonBundleFilename(str) {
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

async function fetchBundleContent(assets) {
    const targetUrl = assets.filter((x) => isCircuitPythonBundleFilename(x.name)).at(0).browser_download_url;
    console.log(targetUrl);
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
        downloadZip,
        uploadZipFromLocal,
        getEntry,
        removeDb,
        downloading: zipDownloading,
        fileReady,
        contents,
    } = useZipStorage("testDb");
    const {
        downloadText,
        uploadTextFile,
        getText,
        downloading: textDownloading,
        textReady,
        clear,
    } = useTextStorage("testText");

    useEffect(() => {
        console.log(boardInfo);
    }, [boardInfo]);

    const menuStructure = [
        {
            text: "now testing",
            handler: async () => {
                const path = "lib/adafruit_hid/__init__.mpy";
                const { dirHandle, fileHandle } = await path2Handles(rootDirHandle, path);
                console.log(fileHandle);
                const libMeta = await extractLibFileMetadata(fileHandle);
                console.log(libMeta);
            },
        },
        {
            label: "tests",
            options: [
                {
                    text: "test prepare",
                    handler: async () => {
                        console.log(boardInfo);
                    },
                },
                {
                    text: "Test fetch bundle",
                    handler: async () => {
                        const bundleAssets = await Promise.all(
                            BUNDLE_REPOS.map(async (repo) => {
                                const assets = await fetchBundleAssets(repo); // was using bundleRepos[0] incorrectly
                                console.log(assets);
                                return assets;
                            })
                        );
                        const bundleList = await Promise.all(
                            bundleAssets.map(async (assets) => {
                                const bundle = await fetchBundleContent(assets);
                                return bundle;
                            })
                        );

                        const combinedBundle = Object.assign({}, ...bundleList);
                        console.log(resolveDependencies(combinedBundle, "adafruit_74hc595"));

                        const bundleTimeStamps = bundleAssets.map((assets) => getBundleTimeStamp(assets));
                        console.log(bundleTimeStamps);

                        // const bundleZipUrls = bundleAssets.map((assets) => extractBundleUrls(assets));
                        // console.log(bundleZipUrls);

                        // await downloadZip(bundleZipUrls[0][0].url);

                        const jsonUrl = bundleAssets[0]
                            .filter((x) => isCircuitPythonBundleFilename(x.name))
                            .at(0).browser_download_url;

                        console.log(jsonUrl);
                        await downloadText(jsonUrl);
                        console.log("end");
                    },
                },
                {
                    text: "Upgrade all libs",
                    handler: async () => {
                        console.log("Upgrade all libraries clicked");
                        if (!rootFolderDirectoryReady) {
                            console.log("no root dir yet");
                            return;
                        }
                        const installedLibs = await getInstalledLibs(rootDirHandle);
                        console.log(installedLibs);
                        const scannedLibs = await collectPythonTopLevelImports(rootDirHandle);
                        console.log(scannedLibs);
                    },
                },
                {
                    text: "upload zip",
                    handler: uploadZipFromLocal,
                },
                {
                    text: "read",
                    handler: async () => {
                        const handle = await getEntry("VERSIONS.txt");
                        const file = await handle.getFile();
                        const text = await file.text();
                        console.log([text]);
                    },
                },
                { text: "remove db", handler: removeDb },
            ],
        },
    ];

    return (
        <TabTemplate menuStructure={menuStructure} title="Library Management">
            {textDownloading ? "text downloading" : "text not downloading"}
            <br />
            {textReady ? getText() : "no text"}
            <hr />
            {zipDownloading ? "zip downloading" : "zip not downloading"}
            <br />
            {fileReady ? contents.toString() : "no files"}
        </TabTemplate>
    );
}
