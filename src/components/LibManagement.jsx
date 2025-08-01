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

async function fetchBundleContent() {
    const targetUrl =
        "https://github.com/adafruit/Adafruit_CircuitPython_Bundle/releases/download/20250729/adafruit-circuitpython-bundle-20250729.json";

    // 已部署的 Cloud Run 代理端点
    const PROXY_ENDPOINT = "https://cpy-lib-proxy-663297601284.us-central1.run.app";

    // 发起请求（代理会加上 Access-Control-Allow-Origin 头，消除 CORS）
    const resp = await fetch(`${PROXY_ENDPOINT}?url=${encodeURIComponent(targetUrl)}`);

    if (!resp.ok) {
        throw new Error(`Failed to fetch bundle: ${resp.status} ${resp.statusText}`);
    }

    const bundle = JSON.parse(await resp.text());
    console.log(bundle);

    return bundle;
}

export default function LibManagement() {
    const { appConfig, rootFolderDirectoryReady, rootDirHandle } = useContext(AppContext);
    const { openZipFile, getItem } = useZipStorage();
    useEffect(() => {
        fetchBundleContent();
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
