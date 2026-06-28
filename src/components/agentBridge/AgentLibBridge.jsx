// AgentLibBridge.jsx
//
// Rendered by AgentBridge ONLY when the bridge is enabled, so the library hooks
// (and their GitHub asset fetch) stay out of normal app startup. It instantiates
// the library-management stack and pushes a UI-agnostic `store.lib` namespace plus
// a pollable `store.libLog` progress feed for the window.__cpyAgent API to call.

import { useContext, useEffect } from "react";
import AppContext from "../../AppContext";
import { store } from "./cpyAgentBridge";
import { useBundles } from "../../hooks/useBundles";
import { useInstalledLibs } from "../../hooks/useInstalledLibs";
import { useLibInstaller } from "../../hooks/useLibInstaller";
import { versionToString } from "../../utilFunctions/version";

export default function AgentLibBridge() {
    const { appConfig, boardInfo, rootDirHandle } = useContext(AppContext);

    const cpyMajor = boardInfo?.cpy_version?.major ?? null;
    const useCommunity = Boolean(appConfig?.config?.lib_management?.use_community_bundle);

    const {
        bundles,
        bundlesReady,
        boardCpySupported,
        downloadBundles,
        refreshBundleState,
    } = useBundles({ cpyMajor, useCommunity });

    const { getInstalled } = useInstalledLibs(rootDirHandle);

    const installer = useLibInstaller({
        bundles,
        bundlesReady,
        boardCpySupported,
        rootDirHandle,
        getInstalled,
        // Silent, non-UI guard + notifier for the agent path.
        requireBoard: () => cpyMajor != null,
        notify: () => {},
        appConfig,
        interactive: false,
        onEvent: (e) => {
            store.libLog.push({ t: Date.now(), ...e });
        },
    });

    // ---- guards (throw JSON-friendly errors instead of popping dialogs) ----
    function requireBoardVersion() {
        if (cpyMajor == null) {
            throw new Error(
                "No CircuitPython board connected (boot_out.txt not found). Ask the user to connect the CIRCUITPY drive."
            );
        }
        return cpyMajor;
    }

    // True only when the bundle(s) for the board's version are locally cached.
    function isDownloaded() {
        return bundles.length > 0 && bundles.every((b) => b.zip.zipReady && b.json.textReady);
    }

    function requireDownloaded() {
        requireBoardVersion();
        if (!isDownloaded()) {
            throw new Error("Library bundles are not downloaded for this board. Call downloadLibs() first.");
        }
    }

    // Iterate the downloaded catalog (parsed bundle JSON) of every active bundle.
    function forEachCatalogEntry(fn) {
        for (const b of bundles) {
            const txt = b.json.getText();
            if (!txt) continue;
            let obj;
            try {
                obj = JSON.parse(txt);
            } catch {
                continue;
            }
            for (const name of Object.keys(obj)) {
                fn(name, obj[name], b);
            }
        }
    }

    // ---- the agent-facing library API ----
    // Rebuilt every render so the closures capture the latest hook state; the
    // window API reads store.lib at call time (same pattern as the serial callbacks).
    store.lib = {
        async libsDownloaded() {
            requireBoardVersion();
            const perBundle = bundles.map((b) => ({
                abbr: b.abbr,
                downloaded: Boolean(b.zip.zipReady && b.json.textReady),
            }));
            return { version: cpyMajor, downloaded: isDownloaded(), bundles: perBundle };
        },

        async libsUpToDate() {
            requireBoardVersion();
            const status = await refreshBundleState();
            if (status === undefined) {
                throw new Error("Could not reach GitHub to check for updates. Check the internet connection.");
            }
            return { upToDate: status === 1, status };
        },

        async downloadLibs() {
            requireBoardVersion();
            await downloadBundles();
            return { ok: true, version: cpyMajor };
        },

        async getAvailableLibs() {
            requireDownloaded();
            const out = [];
            forEachCatalogEntry((name, _obj, b) => out.push({ name, bundle: b.abbr }));
            return out;
        },

        async getInstalledLibs() {
            requireBoardVersion();
            const installed = await getInstalled();
            return installed.map((l) => ({ name: l.name, version: versionToString(l.version) }));
        },

        async getLibInfo(name) {
            requireDownloaded();
            const key = String(name || "");
            let found = null;
            forEachCatalogEntry((libName, obj, b) => {
                if (!found && libName === key) {
                    found = {
                        name: libName,
                        bundle: b.abbr,
                        version: obj.version ?? null,
                        description: obj.pypi_description ?? null,
                        dependencies: obj.dependencies ?? [],
                        gitLink: obj.repo ?? null,
                    };
                }
            });
            if (!found) {
                throw new Error(`Lib '${key}' not found in the downloaded bundles.`);
            }
            return found;
        },

        async searchLibs(query) {
            requireDownloaded();
            const q = String(query || "").toLowerCase();
            const out = [];
            forEachCatalogEntry((name, obj, b) => {
                const desc = obj.pypi_description ?? "";
                if (name.toLowerCase().includes(q) || String(desc).toLowerCase().includes(q)) {
                    out.push({ name, bundle: b.abbr, description: desc || null });
                }
            });
            return out;
        },

        async installLib(name) {
            requireDownloaded();
            return await installer.batchInstallLib([String(name || "")]);
        },

        async uninstallLib(name) {
            requireBoardVersion();
            return await installer.batchUninstallLib([String(name || "")]);
        },

        async autoInstallLibs() {
            requireDownloaded();
            return await installer.autoInstall();
        },
    };

    // Drop the namespace when the bridge is disabled/unmounted so API calls fail clean.
    useEffect(() => {
        return () => {
            store.lib = null;
        };
    }, []);

    return null;
}
