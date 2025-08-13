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

export function useTextStorage(textName) {
    const storageKey = useMemo(() => String(textName), [textName]);
    const [downloading, setDownloading] = useState(false);
    const [textReady, setTextReady] = useState(typeof window !== "undefined" && !!localStorage.getItem(storageKey));

    const isTextContentType = (ct = "") => {
        const c = ct.toLowerCase();
        return (
            c.startsWith("text/") ||
            c.includes("json") ||
            c.includes("xml") ||
            c.includes("csv") ||
            c.includes("yaml") ||
            c.includes("markdown") ||
            c.includes("html")
        );
    };

    const isProbablyBinary = (bytes) => {
        if (!bytes || !bytes.length) return false;
        if (bytes.some((b) => b === 0)) return true;
        const nonPrintable = bytes.reduce((acc, b) => {
            const isPrintable = b === 9 || b === 10 || b === 13 || (b >= 32 && b <= 126) || b >= 128;
            return acc + (isPrintable ? 0 : 1);
        }, 0);
        return nonPrintable / bytes.length > 0.2;
    };

    const setStoredText = useCallback(
        (text) => {
            localStorage.removeItem(storageKey);
            localStorage.setItem(storageKey, text);
            setTextReady(true);
        },
        [storageKey]
    );

    const clear = useCallback(() => {
        localStorage.removeItem(storageKey);
        setTextReady(false);
    }, [storageKey]);

    const downloadText = useCallback(
        async (url) => {
            setDownloading(true);
            try {
                const res = await fetchWithProxy(url);
                const ct = res.headers.get("content-type") || "";
                if (!isTextContentType(ct)) {
                    return { ok: false, reason: "not-text" };
                }
                const text = await res.text();
                const enc = new TextEncoder();
                const bytes = enc.encode(text);
                if (isProbablyBinary(bytes)) {
                    return { ok: false, reason: "not-text" };
                }
                setStoredText(text);
                return { ok: true };
            } catch (e) {
                return { ok: false, error: e?.message || "fetch-failed" };
            } finally {
                setDownloading(false);
            }
        },
        [setStoredText]
    );

    const uploadTextFile = useCallback(() => {
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
                setDownloading(true);
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
                    setDownloading(false);
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

    return {
        downloadText,
        uploadTextFile,
        downloading,
        textReady,
        clear,
    };
}
