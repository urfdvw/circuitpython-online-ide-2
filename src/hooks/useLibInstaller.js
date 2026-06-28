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
    // `interactive` (default true) gates the confirm() prompts so non-UI callers
    // (the agent bridge) don't pop blocking dialogs. `onEvent` streams structured
    // progress events; both default to UI-friendly no-ops.
    interactive = true,
    onEvent = () => {},
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
            if (interactive) confirm("Please download library bundles and retry");
            return;
        }
        if (!requireBoard()) {
            return;
        }
        if (!boardCpySupported) {
            if (interactive)
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
        onEvent({ type: "uninstall", name });
    }

    async function batchUninstallLib(pendingLibNames) {
        setLibChangeInfo("Uninstalling libs");
        const uninstalled = [];
        for (const libName of pendingLibNames) {
            await uninstallLib(libName);
            uninstalled.push(libName.split(".")[0]);
        }
        await sleep(1000); // let the drive settle before re-reading
        await refreshCards();
        setLibChangeInfo("");
        return { ok: true, uninstalled };
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
        const summary = { ok: true, installed: [], upgraded: [], skipped: [], failed: [] };
        const installedLibs = await analyzeMcu();
        if (!installedLibs) {
            // no board / unsupported / bundles missing — analyzeMcu already prompted (UI)
            setLibChangeInfo("");
            return summary;
        }

        // resolve the full dependency closure across all active bundles' manifests
        const bundleJsons = bundles.map((bundle) => bundle.json.getText());
        const libsWithDependencies = resolveDependenciesFromJsonStrings(bundleJsons, pendingLibs);

        for (const bundle of bundles) {
            const needFromBundle = filterNamesInJsons([bundle.json.getText()], libsWithDependencies);
            for (const lib of needFromBundle) {
                const installedLib = installedLibs.filter((il) => il.name.split(".")[0] === lib.name);
                const version = versionToString(lib.version);
                onEvent({ type: "start", name: lib.name });
                try {
                    if (installedLib.length > 0) {
                        if (compareVersions(installedLib[0].version, lib.version) === 0) {
                            logLine(`version of ${lib.name} is the same in bundle and MCU: ${version}`);
                            summary.skipped.push({ name: lib.name, version });
                            onEvent({ type: "skip", name: lib.name, version });
                        } else {
                            const from = versionToString(installedLib[0].version);
                            logLine(
                                `version of ${lib.name} is different in bundle and MCU. bundle: ${version}, MCU: ${from}`
                            );
                            await installLib(lib.name, bundle.zip);
                            summary.upgraded.push({ name: lib.name, version, from });
                            onEvent({ type: "upgrade", name: lib.name, version, from });
                        }
                    } else {
                        logLine(`${lib.name} is not installed yet`);
                        await installLib(lib.name, bundle.zip);
                        summary.installed.push({ name: lib.name, version });
                        onEvent({ type: "install", name: lib.name, version });
                    }
                } catch (e) {
                    const error = e?.message || String(e);
                    logLine(`failed to install ${lib.name}: ${error}`);
                    summary.failed.push({ name: lib.name, error });
                    onEvent({ type: "error", name: lib.name, error });
                }
            }
        }

        summary.ok = summary.failed.length === 0;
        await sleep(1000); // let the drive settle before re-reading
        await refreshCards();
        setLibChangeInfo("");
        return summary;
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
            return { ok: false, installed: [], upgraded: [], skipped: [], failed: [] };
        }
        logLine("auto install started");
        if (appConfig.config.lib_management.clean_up_in_auto) {
            logLine("clean up before installation");
            await clearInstalledLibs();
        }
        const scannedLibs = await collectPythonTopLevelImports(rootDirHandle);
        const summary = await batchInstallLib(scannedLibs);
        notify("Auto install finished");
        logLine("auto install finished");
        return summary;
    }

    return {
        libCards,
        refreshCards,
        autoInstall,
        installationLog,
        libChangeInfo,
        // exposed for non-UI callers (agent bridge); the UI uses card handlers
        batchInstallLib,
        batchUninstallLib,
    };
}
