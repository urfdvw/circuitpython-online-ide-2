import { useEffect, useState } from "react";
import { useZipStorage } from "../utilHooks/useZipStorage";
import { useTextStorage } from "../utilHooks/useTextStorage";
import {
    fetchBundleAssets,
    getBundleTimeStamp,
    extractBundleUrls,
    parseBundleZipVersion,
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
 *  - Version correctness is enforced in code, not by convention: downloads assert the
 *    chosen asset carries the board's major, the cache is stamped with it, and
 *    assertBundleForBoard() re-checks before anything is copied onto the board.
 *  - EVERY piece of a bundle's cache is keyed by the board's major, not just the zip:
 *    the JSON manifest and the release timestamp too. The manifest drives version numbers
 *    and dependency closures, so pairing one version's manifest with another version's zip
 *    would install the wrong libraries — keying them together makes that unrepresentable.
 *  - The Community bundle's storage hooks are always created (rules of hooks) but the
 *    bundle is only included in the active list when `useCommunity` is true.
 *
 * @param {{ cpyMajor: number|null, useCommunity: boolean }} opts
 */
export function useBundles({ cpyMajor, useCommunity }) {
    const zipKey = cpyMajor ?? "none";

    // ---- Adafruit (always active) ----
    const jsonAdafruit = useTextStorage(`jsonAdafruit-${zipKey}`);
    const updateDateTimeAdafruit = useTextStorage(`updateDateTimeAdafruit-${zipKey}`);
    const zipAdafruit = useZipStorage(`zipAdafruit-${zipKey}`);
    const [assetsAdafruit, setAssetsAdafruit] = useState(null);

    // ---- Community (hooks always called; included only when enabled) ----
    const jsonCommunity = useTextStorage(`jsonCommunity-${zipKey}`);
    const updateDateTimeCommunity = useTextStorage(`updateDateTimeCommunity-${zipKey}`);
    const zipCommunity = useZipStorage(`zipCommunity-${zipKey}`);
    const [assetsCommunity, setAssetsCommunity] = useState(null);

    // One-time cleanup of the pre-2.5.2 unversioned keys. Their zips are already gone
    // (the zip cache has always been version-keyed, and an unstamped one is re-downloaded
    // anyway), so these are dead weight — and the manifest is large enough to matter in
    // a ~5MB localStorage budget.
    useEffect(() => {
        for (const legacy of ["jsonAdafruit", "updateDateTimeAdafruit", "jsonCommunity", "updateDateTimeCommunity"]) {
            localStorage.removeItem(legacy);
        }
    }, []);

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

    const [bundlesError, setBundlesError] = useState(null);

    // Readiness of a single bundle, given the release assets we know about:
    //   0   = nothing usable downloaded for this board's CPy version
    //   0.5 = cached but an upgrade is available
    //   1   = up to date
    // Every input is keyed to THIS board's major (zip, manifest, timestamp), so switching
    // to a board with a different major re-offers the download instead of silently reusing
    // the other version's cache.
    // The stamp is required, not merely checked when present: useZipStorage writes it
    // LAST, so its absence means either a cache from before stamping existed or one left
    // half-written by an interrupted download — and nothing distinguishes the two. Both
    // report 0 and are re-downloaded rather than installed from.
    function bundleReadiness(bundle, assets) {
        const cached = bundle.updateDateTime.getText();
        if (!assets || !cached || !bundle.zip.zipReady || !bundle.json.textReady) return 0;
        if (bundle.zip.cacheMeta?.cpyMajor !== cpyMajor) return 0;
        return getBundleTimeStamp(assets) === cached ? 1 : 0.5;
    }

    // Derived, not stored: recomputed whenever the assets, the board version, or the
    // caches change, so it can never describe a board we are no longer connected to.
    const bundlesReady = bundles.reduce((low, bundle) => Math.min(low, bundleReadiness(bundle, bundle.assets)), 1);

    // Fetch the latest release assets and report the resulting readiness.
    async function refreshBundleState() {
        setBundlesError(null);
        try {
            let lowBundle = 1;
            for (const bundle of bundles) {
                const assets = await fetchBundleAssets(bundle.repo);
                bundle.setAssets(assets);
                lowBundle = Math.min(bundleReadiness(bundle, assets), lowBundle);
            }
            return lowBundle;
        } catch (e) {
            console.error("Failed to get bundle assets from GitHub", e);
            setBundlesError("Failed to reach GitHub. Please check your internet connection and retry.");
            return undefined; // callers treat undefined as "couldn't reach GitHub"
        }
    }

    // Re-fetch the assets when the active bundle set changes. Board/cache changes do
    // not need a re-fetch: bundlesReady is derived and follows them on its own.
    useEffect(() => {
        refreshBundleState();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [useCommunity]);

    // The board's CPy version is supported when the Adafruit release offers a zip for it.
    const boardCpySupported =
        cpyMajor != null && extractBundleUrls(assetsAdafruit || []).some((u) => u.version === cpyMajor);

    /**
     * Throws unless the bundle's local zip cache is the one built for the board's
     * current CircuitPython major, and is complete. Call it before anything is copied
     * onto the board. Two checks, from different sources:
     *   1. the cache the hook reads from is named for THIS major — recomputed here
     *      independently, so a future change that stops keying the cache by version
     *      fails loudly instead of silently installing the wrong libraries
     *   2. the major stamped INSIDE the cache when the download finished matches
     */
    function assertBundleForBoard(bundle) {
        if (cpyMajor == null) {
            throw new Error(
                "No CircuitPython board connected (boot_out.txt not found) — cannot verify the library bundle version."
            );
        }
        const expected = `zip${bundle.abbr}-${cpyMajor}`;
        if (bundle.zip.cacheName !== expected) {
            throw new Error(
                `The ${bundle.abbr} bundle cache in use (${bundle.zip.cacheName}) is not the one for CircuitPython ${cpyMajor} (${expected}). Refusing to install libraries from another version.`
            );
        }
        // The stamp is written last, so a missing one means the cache is either
        // pre-stamping or a partially written download. Neither is safe to install from.
        const stamped = bundle.zip.cacheMeta?.cpyMajor;
        if (stamped == null) {
            throw new Error(
                `The ${bundle.abbr} bundle cache is incomplete or was written by an older version of the IDE. Download the bundles again before installing.`
            );
        }
        if (stamped !== cpyMajor) {
            throw new Error(
                `The ${bundle.abbr} bundle cache was downloaded for CircuitPython ${stamped}, but this board runs CircuitPython ${cpyMajor}. Download the bundles again before installing.`
            );
        }
    }

    // Downloads ONLY the files for the board's CPy version: one zip per active bundle
    // (the one matching cpyMajor) plus that bundle's JSON manifest. Requires a board.
    async function downloadBundles() {
        if (cpyMajor == null) {
            throw new Error(
                "No CircuitPython board connected (boot_out.txt not found) — cannot choose a library bundle version."
            );
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
            // Re-derive the version from the URL we are about to fetch: the download
            // cannot start unless the file itself carries the board's major.
            if (parseBundleZipVersion(match.url.split("/").pop()) !== cpyMajor) {
                throw new Error(
                    `Refusing to download ${bundle.abbr}: ${match.url} is not a CircuitPython ${cpyMajor} bundle.`
                );
            }
            await bundle.zip.downloadZipFromWeb(match.url, { cpyMajor, url: match.url, ts: Date.now() });

            // The manifest is half of the bundle: it supplies the version numbers and the
            // dependency closure the installer works from. downloadTextFromWeb() reports
            // failure by return value rather than throwing, so check it — letting a failure
            // through here would leave a fresh zip next to no manifest and still mark the
            // bundle downloaded.
            const jsonAsset = bundle.assets.filter((x) => isBundleJsonFileName(x.name)).at(0);
            if (!jsonAsset) {
                throw new Error(`The ${bundle.abbr} release has no library manifest to download.`);
            }
            const jsonResult = await bundle.json.downloadTextFromWeb(jsonAsset.browser_download_url);
            if (!jsonResult?.ok) {
                throw new Error(
                    `Downloaded the ${bundle.abbr} zip but not its library manifest ` +
                        `(${jsonResult?.error || jsonResult?.reason || "unknown error"}). Try downloading again.`
                );
            }

            // Written last, once both halves are cached: this timestamp is what marks the
            // bundle as up to date.
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
        assertBundleForBoard,
        downloadBundles,
        downloadingBundleInfo,
        getBundleVersionDiff,
        refreshBundleState,
    };
}
