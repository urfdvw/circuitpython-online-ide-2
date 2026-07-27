import { useCallback, useEffect, useMemo, useState } from "react";

// Proxy fetch helper
async function fetchWithProxy(targetUrl) {
    const PROXY_ENDPOINT = "https://cpy-lib-proxy-663297601284.us-central1.run.app";
    const resp = await fetch(`${PROXY_ENDPOINT}?url=${encodeURIComponent(targetUrl)}`);
    if (!resp.ok) {
        throw new Error(`Failed to fetch: ${resp.status} ${resp.statusText}`);
    }
    return resp;
}

const hasStoredText = (key) => typeof window !== "undefined" && !!localStorage.getItem(key);

const isQuotaError = (e) =>
    e instanceof DOMException && (e.name === "QuotaExceededError" || e.code === 22 || e.code === 1014);

/**
 * Text cached in localStorage under `textName`.
 *
 * `evictPrefix` names the family this key belongs to (e.g. "jsonAdafruit" for
 * "jsonAdafruit-9"). Callers version their keys, so copies for other versions pile up
 * against the ~5MB origin budget; when a write runs out of room, the siblings are
 * dropped and the write is retried. Evicting lazily rather than on every write keeps
 * the other version's copy usable for as long as it fits.
 */
export function useTextStorage(textName, { evictPrefix = "" } = {}) {
    const storageKey = useMemo(() => String(textName), [textName]);
    const [preparingText, setPreparingText] = useState(false);
    const [textReady, setTextReady] = useState(() => hasStoredText(storageKey));

    // Adjust state during render when the key changes: callers key by things that can
    // change at runtime (e.g. the board's CPy major), and readiness of the previous
    // key says nothing about the new one.
    const [seenKey, setSeenKey] = useState(storageKey);
    if (seenKey !== storageKey) {
        setSeenKey(storageKey);
        setTextReady(hasStoredText(storageKey));
    }

    const isProbablyBinary = (bytes) => {
        if (!bytes || !bytes.length) return false;
        if (bytes.some((b) => b === 0)) return true;
        const nonPrintable = bytes.reduce((acc, b) => {
            const isPrintable = b === 9 || b === 10 || b === 13 || (b >= 32 && b <= 126) || b >= 128;
            return acc + (isPrintable ? 0 : 1);
        }, 0);
        return nonPrintable / bytes.length > 0.2;
    };

    // Drop the other versions of this key's family (never the key itself), returning
    // whether anything was freed.
    const evictSiblings = useCallback(() => {
        if (!evictPrefix) return false;
        const doomed = Object.keys(localStorage).filter(
            (k) => k !== storageKey && k.startsWith(`${evictPrefix}-`)
        );
        doomed.forEach((k) => localStorage.removeItem(k));
        return doomed.length > 0;
    }, [storageKey, evictPrefix]);

    // Single write path for both setters, so a full quota can never escape as a raw
    // DOM exception that reads like a download failure.
    const writeText = useCallback(
        (text) => {
            localStorage.removeItem(storageKey);
            try {
                localStorage.setItem(storageKey, text);
            } catch (e) {
                if (!isQuotaError(e) || !evictSiblings()) {
                    throw isQuotaError(e)
                        ? new Error(`Browser storage is full — could not cache '${storageKey}'.`)
                        : e;
                }
                try {
                    localStorage.setItem(storageKey, text);
                } catch (retryError) {
                    throw isQuotaError(retryError)
                        ? new Error(`Browser storage is full — could not cache '${storageKey}'.`)
                        : retryError;
                }
            }
        },
        [storageKey, evictSiblings]
    );

    const setStoredText = useCallback(
        (text) => {
            writeText(text);
            setTextReady(true);
        },
        [writeText]
    );

    const clearTextCache = useCallback(() => {
        localStorage.removeItem(storageKey);
        setTextReady(false);
    }, [storageKey]);

    const downloadTextFromWeb = useCallback(
        async (url) => {
            setPreparingText(true);
            try {
                const res = await fetchWithProxy(url);
                const text = await res.text();
                const enc = new TextEncoder();
                const bytes = enc.encode(text);
                if (isProbablyBinary(bytes)) {
                    console.error("fetch failed: isProbablyBinary");
                    return { ok: false, reason: "not-text" };
                }
                setStoredText(text);
                console.log("fetch finished");
                return { ok: true };
            } catch (e) {
                console.error("fetch failed");
                return { ok: false, error: e?.message || "fetch-failed" };
            } finally {
                setPreparingText(false);
            }
        },
        [setStoredText]
    );

    const uploadTextFromLocal = useCallback(() => {
        return new Promise((resolve) => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".txt,.csv,.json,.xml,.md,.log,.yaml,.yml,text/*,application/json,application/xml";
            input.style.display = "none";
            document.body.appendChild(input);

            const cleanup = () => {
                document.body.removeChild(input);
            };

            input.onchange = async () => {
                const file = input.files && input.files[0];
                if (!file) {
                    cleanup();
                    return resolve({ ok: false, reason: "no-file" });
                }
                setPreparingText(true);
                try {
                    if (
                        file.type &&
                        !file.type.startsWith("text/") &&
                        ![
                            "application/json",
                            "application/xml",
                            "application/yaml",
                            "application/x-yaml",
                            "application/csv",
                        ].includes(file.type)
                    ) {
                        return resolve({ ok: false, reason: "not-text" });
                    }

                    const buf = await file.arrayBuffer();
                    const bytes = new Uint8Array(buf);
                    if (isProbablyBinary(bytes)) {
                        return resolve({ ok: false, reason: "not-text" });
                    }

                    const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
                    setStoredText(text);
                    return resolve({ ok: true });
                } catch (e) {
                    return resolve({ ok: false, error: e?.message || "read-failed" });
                } finally {
                    setPreparingText(false);
                    cleanup();
                }
            };

            input.click();
        });
    }, [setStoredText]);

    useEffect(() => {
        const onStorage = (e) => {
            if (e.key === storageKey) {
                setTextReady(!!e.newValue);
            }
        };
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, [storageKey]);

    function getText() {
        return localStorage.getItem(storageKey);
    }

    function setText(text) {
        writeText(text);
    }

    return {
        downloadTextFromWeb,
        uploadTextFromLocal,
        getText,
        setText,
        clearTextCache,
        preparingText,
        textReady,
    };
}
