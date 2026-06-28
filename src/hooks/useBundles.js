import { useEffect, useState } from "react";
import { useZipStorage } from "../utilHooks/useZipStorage";
import { useTextStorage } from "../utilHooks/useTextStorage";
import {
    fetchBundleAssets,
    getBundleTimeStamp,
    extractBundleUrls,
    isBundleJsonFileName,
} from "../utilFunctions/installedLibUtils";

/**
 * Owns the CircuitPython library bundles: their GitHub assets, the cached zip/JSON,
 * download orchestration, and readiness state.
 *
 * Design notes:
 *  - Versions are NOT hardcoded. Each bundle keeps a single zip cache whose IndexedDB
 *    name encodes the connected board's CPy major (`cpyMajor`), so only the board's
 *    version is ever materialized. Supported versions are derived from the live release
 *    assets via extractBundleUrls(), so new CPy majors need no code changes.
 *  - The Community bundle's storage hooks are always created (rules of hooks) but the
 *    bundle is only included in the active list when `useCommunity` is true.
 *
 * @param {{ cpyMajor: number|null, useCommunity: boolean }} opts
 */
export function useBundles({ cpyMajor, useCommunity }) {
    const zipKey = cpyMajor ?? "none";

    // ---- Adafruit (always active) ----
    const jsonAdafruit = useTextStorage("jsonAdafruit");
    const updateDateTimeAdafruit = useTextStorage("updateDateTimeAdafruit");
    const zipAdafruit = useZipStorage(`zipAdafruit-${zipKey}`);
    const [assetsAdafruit, setAssetsAdafruit] = useState(null);

    // ---- Community (hooks always called; included only when enabled) ----
    const jsonCommunity = useTextStorage("jsonCommunity");
    const updateDateTimeCommunity = useTextStorage("updateDateTimeCommunity");
    const zipCommunity = useZipStorage(`zipCommunity-${zipKey}`);
    const [assetsCommunity, setAssetsCommunity] = useState(null);

    const bundles = [
        {
            repo: "Adafruit_CircuitPython_Bundle",
            abbr: "Adafruit",
            json: jsonAdafruit,
            zip: zipAdafruit,
            updateDateTime: updateDateTimeAdafruit,
            assets: assetsAdafruit,
            setAssets: setAssetsAdafruit,
        },
        ...(useCommunity
            ? [
                  {
                      repo: "CircuitPython_Community_Bundle",
                      abbr: "Community",
                      json: jsonCommunity,
                      zip: zipCommunity,
                      updateDateTime: updateDateTimeCommunity,
                      assets: assetsCommunity,
                      setAssets: setAssetsCommunity,
                  },
              ]
            : []),
    ];

    const [bundlesReady, setBundlesReady] = useState(0);
    const [bundlesError, setBundlesError] = useState(null);

    // Fetch the latest release assets and compute readiness:
    //   0   = nothing downloaded
    //   0.5 = cached but an upgrade is available
    //   1   = up to date
    async function refreshBundleState() {
        setBundlesError(null);
        try {
            let lowBundle = 1;
            for (const bundle of bundles) {
                const assets = await fetchBundleAssets(bundle.repo);
                bundle.setAssets(assets);
                const cached = bundle.updateDateTime.getText();
                if (cached) {
                    lowBundle = Math.min(getBundleTimeStamp(assets) === cached ? 1 : 0.5, lowBundle);
                } else {
                    lowBundle = Math.min(0, lowBundle);
                }
            }
            setBundlesReady(lowBundle);
            return lowBundle;
        } catch (e) {
            console.error("Failed to get bundle assets from GitHub", e);
            setBundlesError("Failed to reach GitHub. Please check your internet connection and retry.");
            return undefined; // callers treat undefined as "couldn't reach GitHub"
        }
    }

    useEffect(() => {
        refreshBundleState();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [useCommunity]);

    // The board's CPy version is supported when the Adafruit release offers a zip for it.
    const boardCpySupported =
        cpyMajor != null && extractBundleUrls(assetsAdafruit || []).some((u) => u.version === cpyMajor);

    // Downloads ONLY the files for the board's CPy version: one zip per active bundle
    // (the one matching cpyMajor) plus that bundle's JSON manifest. Requires a board.
    async function downloadBundles() {
        if (cpyMajor == null) {
            return;
        }
        for (const bundle of bundles) {
            if (!bundle.assets) {
                continue;
            }
            const match = extractBundleUrls(bundle.assets).find((u) => u.version === cpyMajor);
            if (!match) {
                // this bundle doesn't ship the board's version — skip it
                continue;
            }
            await bundle.zip.downloadZipFromWeb(match.url);

            const jsonAsset = bundle.assets.filter((x) => isBundleJsonFileName(x.name)).at(0);
            if (jsonAsset) {
                await bundle.json.downloadTextFromWeb(jsonAsset.browser_download_url);
            }
            bundle.updateDateTime.setText(getBundleTimeStamp(bundle.assets));
        }
        await refreshBundleState();
    }

    // Non-empty while a zip/JSON is being fetched (drives a NON-blocking progress indicator).
    function downloadingBundleInfo() {
        for (const bundle of bundles) {
            if (bundle.zip.preparingZip) {
                return `Downloading CircuitPython ${cpyMajor} libraries of ${bundle.repo}`;
            }
            if (bundle.json.preparingText) {
                return `Downloading content list of ${bundle.repo}`;
            }
        }
        return "";
    }

    function getBundleVersionDiff() {
        return bundles
            .map((bundle) => {
                if (!bundle.assets) return null;
                const bundleTime = getBundleTimeStamp(bundle.assets).split("T")[0];
                const installedTime = (bundle.updateDateTime.getText() || "").split("T")[0];
                return bundleTime !== installedTime ? `${bundle.abbr}: ${installedTime} -> ${bundleTime}` : null;
            })
            .filter((x) => x)
            .join("\n");
    }

    return {
        bundles,
        bundlesReady,
        bundlesError,
        boardCpySupported,
        downloadBundles,
        downloadingBundleInfo,
        getBundleVersionDiff,
        refreshBundleState,
    };
}
