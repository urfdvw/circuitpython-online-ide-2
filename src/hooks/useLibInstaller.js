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
    forEachCatalogEntry,
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
    // Throws unless a bundle's cached zip is the one built for the board's current
    // CircuitPython major (useBundles.assertBundleForBoard). Every path that copies
    // a lib onto the board runs it, so a version mismatch can never reach the drive.
    assertBundleForBoard,
    cpyMajor = null,
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

    // Gatekeeper for every board-touching action. Returns `{ libs }` with the libs
    // installed on the board, or `{ reason }` naming the precondition that failed so
    // non-interactive callers (the agent bridge) can report it instead of an empty
    // success. The reason is returned rather than stashed on the hook, so a UI card and
    // the agent bridge running at the same time cannot read each other's.
    async function analyzeMcu() {
        if (bundlesReady === 0) {
            if (interactive) confirm("Please download library bundles and retry");
            return { reason: "Library bundles are not downloaded for this board's CircuitPython version." };
        }
        if (!requireBoard()) {
            return { reason: "No CircuitPython board connected (boot_out.txt not found)." };
        }
        if (!boardCpySupported) {
            if (interactive)
                confirm(
                    "CircuitPython version not supported. Please install the latest version of CircuitPython on the microcontroller and retry."
                );
            return { reason: `CircuitPython ${cpyMajor ?? "?"} is not offered by the library bundle.` };
        }
        return { libs: await getInstalled() };
    }

    /* ---- uninstall ---- */

    // A lib is on the board as either a folder (`lib/<name>/`) or a single file
    // (`lib/<name>.mpy`), so both shapes are attempted and a missing one is normal.
    // Removing NEITHER is not normal, though: it means the lib was not there, or the
    // delete failed. Distinguish the two so the caller can report "removed nothing"
    // instead of reporting a success that never happened.
    // -> { removed: boolean }, throws if a delete itself failed.
    async function uninstallLib(name) {
        name = name.split(".")[0]; // strip extension if present

        // NOTE: path2Handles CREATES by default. Every lookup here passes create:false —
        // without it, asking for a lib that is not on the board would make an empty
        // lib/<name>/ folder (or lib/<name>.mpy file) just to delete it again, and the
        // uninstall would "succeed" for something that was never installed.
        let libDirHandle;
        try {
            ({ dirHandle: libDirHandle } = await path2Handles(rootDirHandle, `lib`, { create: false }));
        } catch {
            throw new Error(`The board has no lib folder, so ${name} is not installed.`);
        }

        let removed = false;
        const removeIfPresent = async (path, pick) => {
            let entry;
            try {
                entry = pick(await path2Handles(rootDirHandle, path, { create: false }));
            } catch {
                return; // not present in this shape
            }
            if (!entry) return;
            // A failed delete is a real failure and propagates, unlike a failed lookup.
            await removeEntry(libDirHandle, entry);
            removed = true;
        };

        // The three shapes getInstalledLibVersions() recognises as an installed lib:
        // a package folder, a compiled .mpy, or a plain-source .py.
        await removeIfPresent(`lib/${name}`, (h) => h.dirHandle);
        await removeIfPresent(`lib/${name}.mpy`, (h) => h.fileHandle);
        await removeIfPresent(`lib/${name}.py`, (h) => h.fileHandle);

        if (!removed) {
            throw new Error(`${name} is not installed on the board.`);
        }

        logLine(`uninstalled ${name}`);
        onEvent({ type: "uninstall", name });
        return { removed };
    }

    async function batchUninstallLib(pendingLibNames) {
        setLibChangeInfo("Uninstalling libs");
        const summary = { ok: true, version: cpyMajor, uninstalled: [], failed: [] };

        // Uninstalling needs the board, but not the bundles, so it guards on its own
        // instead of going through analyzeMcu(). Without this the first path2Handles()
        // rejects into an unhandled rejection in the card's click handler.
        if (!requireBoard()) {
            setLibChangeInfo("");
            return { ...summary, ok: false, error: "No CircuitPython board connected (boot_out.txt not found)." };
        }

        for (const libName of pendingLibNames) {
            const name = libName.split(".")[0];
            try {
                await uninstallLib(libName);
                summary.uninstalled.push(name);
            } catch (e) {
                const error = e?.message || String(e);
                logLine(`failed to uninstall ${name}: ${error}`);
                summary.failed.push({ name, error });
                onEvent({ type: "error", name, error });
            }
        }

        summary.ok = summary.failed.length === 0;
        await sleep(1000); // let the drive settle before re-reading
        await refreshCards();
        setLibChangeInfo("");
        return summary;
    }

    /* ---- install ---- */

    async function installLib(name, bundle) {
        name = name.split(".")[0]; // strip extension if present
        // Re-check right before the copy: the board could have been swapped since
        // the batch started.
        assertBundleForBoard(bundle);
        const zip = bundle.zip;
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
        const summary = { ok: true, version: cpyMajor, installed: [], upgraded: [], skipped: [], failed: [] };
        const { libs: installedLibs, reason } = await analyzeMcu();
        if (!installedLibs) {
            // no board / unsupported / bundles missing — analyzeMcu already prompted
            // (UI); report the reason so non-interactive callers don't read this as
            // a successful no-op.
            setLibChangeInfo("");
            return { ...summary, ok: false, error: reason || "Preconditions for installing libraries are not met." };
        }

        // Nothing is copied unless every active bundle's cache belongs to THIS board's
        // CircuitPython major. Abort the whole batch rather than failing lib by lib.
        try {
            bundles.forEach(assertBundleForBoard);
        } catch (e) {
            setLibChangeInfo("");
            return { ...summary, ok: false, error: e?.message || String(e) };
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
                            await installLib(lib.name, bundle);
                            summary.upgraded.push({ name: lib.name, version, from });
                            onEvent({ type: "upgrade", name: lib.name, version, from });
                        }
                    } else {
                        logLine(`${lib.name} is not installed yet`);
                        await installLib(lib.name, bundle);
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
        const { libs: installedLibs } = await analyzeMcu();
        const cards = [];
        if (boardCpySupported && installedLibs) {
            forEachCatalogEntry(bundles, (bundleLibName, libObj, bundle) => {
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
                    libObj,
                    libDisplayName: bundleLibName,
                    installHandler: async () => {
                        const result = await batchInstallLib([bundleLibName]);
                        // Report what actually happened: a blocked batch (e.g. a
                        // bundle/board version mismatch) must not read as success.
                        notify(result.ok ? `Installed ${bundleLibName}` : result.error || `Failed to install ${bundleLibName}`);
                    },
                    uninstallHandler: async () => {
                        const result = await batchUninstallLib([bundleLibName]);
                        notify(
                            result.ok
                                ? `Uninstalled ${bundleLibName}`
                                : result.error || result.failed[0]?.error || `Failed to uninstall ${bundleLibName}`
                        );
                    },
                    installedVersion,
                });
            });
        }
        setLibCards(cards);
        return cards;
    }

    /* ---- auto install ---- */

    async function clearInstalledLibs() {
        const { libs: installedLibs } = await analyzeMcu();
        if (!installedLibs) {
            // The batchInstallLib() that follows re-checks and reports the same reason.
            return;
        }
        await batchUninstallLib(installedLibs.map((lib) => lib.name));
    }

    async function autoInstall() {
        if (!requireBoard()) {
            return {
                ok: false,
                version: cpyMajor,
                error: "No CircuitPython board connected (boot_out.txt not found).",
                installed: [],
                upgraded: [],
                skipped: [],
                failed: [],
            };
        }
        logLine("auto install started");
        if (appConfig.config.lib_management.clean_up_in_auto) {
            logLine("clean up before installation");
            await clearInstalledLibs();
        }
        const scannedLibs = await collectPythonTopLevelImports(rootDirHandle);
        const summary = await batchInstallLib(scannedLibs);
        notify(summary.ok ? "Auto install finished" : summary.error || "Auto install failed");
        logLine(summary.ok ? "auto install finished" : `auto install failed: ${summary.error}`);
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
