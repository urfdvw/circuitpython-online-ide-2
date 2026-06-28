import { useState } from "react";
import {
    path2Handles,
    copyEntry,
    removeEntry,
} from "../utilComponents/react-local-file-system/utilities/fileSystemUtils";
import {
    collectPythonTopLevelImports,
    resolveDependenciesFromJsonStrings,
    filterNamesInJsons,
    sleep,
} from "../utilFunctions/installedLibUtils";
import { compareVersions, versionToString } from "../utilFunctions/version";

/**
 * Orchestrates installing/uninstalling/auto-installing libraries onto the board,
 * including dependency resolution, the installation log, and the card model.
 *
 * Consumes the bundle state (useBundles), the installed-lib reader (useInstalledLibs),
 * and the board guard (useBoardGuard.requireBoard). The owning component renders the
 * returned `libCards`, `installationLog`, and reacts to `libChangeInfo` (which is
 * non-empty only during file-changing operations, so it can drive a blocking overlay).
 */
export function useLibInstaller({
    bundles,
    bundlesReady,
    boardCpySupported,
    rootDirHandle,
    getInstalled,
    requireBoard,
    notify,
    appConfig,
}) {
    const [installationLog, setInstallationLog] = useState("");
    const [libChangeInfo, setLibChangeInfo] = useState("");
    const [libCards, setLibCards] = useState([]);

    function logLine(msg) {
        const now = new Date().toLocaleTimeString();
        setInstallationLog((cur) => cur + `\n${now}: ${msg}`);
    }

    // Gatekeeper for every board-touching action. Returns the installed libs, or
    // undefined after prompting the user to fix a precondition.
    async function analyzeMcu() {
        if (bundlesReady === 0) {
            confirm("Please download library bundles and retry");
            return;
        }
        if (!requireBoard()) {
            return;
        }
        if (!boardCpySupported) {
            confirm(
                "CircuitPython version not supported. Please install the latest version of CircuitPython on the microcontroller and retry."
            );
            return;
        }
        return await getInstalled();
    }

    /* ---- uninstall ---- */

    async function uninstallLib(name) {
        name = name.split(".")[0]; // strip extension if present
        const { dirHandle: libDirHandle } = await path2Handles(rootDirHandle, `lib`);

        // try as a folder lib (succeeds even if absent)
        try {
            const { dirHandle: folderLib } = await path2Handles(rootDirHandle, `lib/${name}`);
            await removeEntry(libDirHandle, folderLib);
        } catch {
            console.log(`failed uninstalled folder lib: ${name}`);
        }

        // try as a file lib (succeeds even if absent)
        try {
            const { fileHandle: fileLib } = await path2Handles(rootDirHandle, `lib/${name}.mpy`);
            await removeEntry(libDirHandle, fileLib);
        } catch {
            console.log(`failed uninstalled file lib: ${name}`);
        }

        logLine(`uninstalled ${name}`);
    }

    async function batchUninstallLib(pendingLibNames) {
        setLibChangeInfo("Uninstalling libs");
        for (const libName of pendingLibNames) {
            await uninstallLib(libName);
        }
        await sleep(1000); // let the drive settle before re-reading
        await refreshCards();
        setLibChangeInfo("");
    }

    /* ---- install ---- */

    async function installLib(name, zip) {
        name = name.split(".")[0]; // strip extension if present
        setLibChangeInfo(`Installing ${name}`);
        const { dirHandle } = await path2Handles(rootDirHandle, "lib");
        try {
            const folderLib = await zip.getEntryFromCache(`lib/${name}`);
            await copyEntry(folderLib, dirHandle, folderLib.name);
            console.log(`installed folder lib: ${name}`);
        } catch (e) {
            console.warn(e);
            const fileLib = await zip.getEntryFromCache(`lib/${name}.mpy`);
            await copyEntry(fileLib, dirHandle, fileLib.name);
            console.log(`installed file lib: ${name}`);
        }
        logLine(`installed ${name}`);
        setLibChangeInfo("");
    }

    async function batchInstallLib(pendingLibs) {
        setLibChangeInfo("Installing Libs");
        const installedLibs = await analyzeMcu();
        if (!installedLibs) {
            // no board / unsupported / bundles missing — analyzeMcu already prompted
            setLibChangeInfo("");
            return;
        }

        // resolve the full dependency closure across all active bundles' manifests
        const bundleJsons = bundles.map((bundle) => bundle.json.getText());
        const libsWithDependencies = resolveDependenciesFromJsonStrings(bundleJsons, pendingLibs);

        for (const bundle of bundles) {
            const needFromBundle = filterNamesInJsons([bundle.json.getText()], libsWithDependencies);
            for (const lib of needFromBundle) {
                const installedLib = installedLibs.filter((il) => il.name.split(".")[0] === lib.name);
                if (installedLib.length > 0) {
                    if (compareVersions(installedLib[0].version, lib.version) === 0) {
                        logLine(`version of ${lib.name} is the same in bundle and MCU: ${versionToString(lib.version)}`);
                    } else {
                        logLine(
                            `version of ${lib.name} is different in bundle and MCU. bundle: ${versionToString(
                                lib.version
                            )}, MCU: ${versionToString(installedLib[0].version)}`
                        );
                        await installLib(lib.name, bundle.zip);
                    }
                } else {
                    logLine(`${lib.name} is not installed yet`);
                    await installLib(lib.name, bundle.zip);
                }
            }
        }

        await sleep(1000); // let the drive settle before re-reading
        await refreshCards();
        setLibChangeInfo("");
    }

    /* ---- cards ---- */

    async function refreshCards() {
        const installedLibs = await analyzeMcu();
        const cards = [];
        if (boardCpySupported && installedLibs) {
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
                        installedVersion,
                    });
                }
            }
        }
        setLibCards(cards);
        return cards;
    }

    /* ---- auto install ---- */

    async function clearInstalledLibs() {
        const installedLibs = await analyzeMcu();
        if (!installedLibs) {
            return;
        }
        await batchUninstallLib(installedLibs.map((lib) => lib.name));
    }

    async function autoInstall() {
        if (!requireBoard()) {
            return;
        }
        logLine("auto install started");
        if (appConfig.config.lib_management.clean_up_in_auto) {
            logLine("clean up before installation");
            await clearInstalledLibs();
        }
        const scannedLibs = await collectPythonTopLevelImports(rootDirHandle);
        await batchInstallLib(scannedLibs);
        notify("Auto install finished");
        logLine("auto install finished");
    }

    return {
        libCards,
        refreshCards,
        autoInstall,
        installationLog,
        libChangeInfo,
    };
}
