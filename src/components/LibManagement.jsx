import TabTemplate from "../utilComponents/TabTemplate";
import { useContext, useEffect } from "react";
import { AppContext } from "../AppContext";
import { getFromPath, checkFileExists } from "../utilComponents/react-local-file-system/utilities/fileSystemUtils";
import { collectPythonTopLevelImports } from "../utilFunctions/fileSysUtils";

import { useZipStorage } from "../utilHooks/useZipStorage";
const bundleRepos = ["Adafruit_CircuitPython_Bundle", "CircuitPython_Community_Bundle"];

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
    const pattern = /^(adafruit-circuitpython-bundle|circuitpython-community-bundle)-\d{8}\.json$/;
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
    return Array.from(visited)
}

async function fetchBundleAssets(repo) {
    const response = await fetch(`https://api.github.com/repos/adafruit/${repo}/releases/latest`);
    const data = await response.json();

    return data.assets
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
    return assets.at(0).updated_at
}

export default function LibManagement() {
    const { appConfig, rootFolderDirectoryReady, rootDirHandle } = useContext(AppContext);
    const { openZipFile, getItem } = useZipStorage();

    const menuStructure = [
        {
            text: "Test fetch bundle",
            handler: async () => {
                const bundleAssets = await Promise.all(
                    bundleRepos.map(async (repo) => {
                        const assets = await fetchBundleAssets(repo);  // was using bundleRepos[0] incorrectly
                        console.log(assets)
                        return assets;
                    })
                );
                const bundleList = await Promise.all(
                    bundleAssets.map(async (assets) => {
                        const bundle = await fetchBundleContent(assets);
                        return bundle;
                    })
                );

                const combinedBundle = Object.assign({}, ...bundleList)
                console.log(resolveDependencies(combinedBundle, "adafruit_74hc595"));

                const bundleTimeStamps = bundleAssets.map(assets => getBundleTimeStamp(assets))
                console.log(bundleTimeStamps)

            }
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
            label: "zip test",
            options: [
                {
                    text: "upload",
                    handler: openZipFile,
                },
                {
                    text: "read",
                    handler: async () => {
                        const handle = await getItem("cource dir/touchbar.py");
                        const file = await handle.getFile();
                        console.log([file]);
                    },
                },
            ],
        },
    ];

    return <TabTemplate menuStructure={menuStructure} title="Library Management"></TabTemplate>;
}
