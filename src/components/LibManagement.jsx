import TabTemplate from "../utilComponents/TabTemplate";
import { useContext, useEffect } from "react";
import { AppContext } from "../AppContext";
import { getFromPath, checkFileExists } from "../utilComponents/react-local-file-system/utilities/fileSystemUtils";
import { collectPythonTopLevelImports } from "../utilFunctions/fileSysUtils";

import { useZipStorage } from "../utilHooks/useZipStorage";
const LIB_PATH = ".lib"; // move to const

async function getInstalledLibs(rootDirHandle) {
    const libFileExists = await checkFileExists(rootDirHandle, LIB_PATH);
    if (!libFileExists) {
        return "no such file";
        // need better corner case handle in a higher level
    }
    const text = await getFromPath(rootDirHandle, LIB_PATH);
    return text;
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
    const result = new Set();
    const externalDeps = new Set();

    function dfs(name) {
        if (!data[name] || visited.has(name)) return;
        visited.add(name);
        result.add(name);

        const deps = data[name].dependencies || [];
        const externals = data[name].external_dependencies || [];

        for (const dep of deps) {
            dfs(dep);
        }

        for (const ext of externals) {
            externalDeps.add(ext);
        }
    }

    dfs(targetName);

    return {
        internalNames: Array.from(result),
        externalDependencies: Array.from(externalDeps),
    };
}

async function fetchBundleContent(repo) {
    const response = await fetch(`https://api.github.com/repos/adafruit/${repo}/releases/latest`);
    const data = await response.json();

    const targetUrl = data.assets.filter((x) => isCircuitPythonBundleFilename(x.name)).at(0).browser_download_url;
    console.log(targetUrl);

    const resp = await fetchWithProxy(targetUrl);
    const text = await resp.text();
    console.log(text);
    const bundle = JSON.parse(text);
    console.log(resolveDependencies(bundle, "adafruit_74hc595"));

    return bundle;
}

export default function LibManagement() {
    const { appConfig, rootFolderDirectoryReady, rootDirHandle } = useContext(AppContext);
    const { openZipFile, getItem } = useZipStorage();
    useEffect(() => {
        fetchBundleContent("Adafruit_CircuitPython_Bundle");
        fetchBundleContent("CircuitPython_Community_Bundle");
    }, []);

    const menuStructure = [
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
