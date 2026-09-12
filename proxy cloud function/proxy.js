const REPOSITORIES = ["CircuitPython_Community_Bundle", "Adafruit_CircuitPython_Bundle"];
const ASSET_HOSTS = new Set(["release-assets.githubusercontent.com", "objects.githubusercontent.com"]);

export function isAllowedUrl(url, allowAsset = false) {
    if (url.protocol !== "https:" || url.port || url.username || url.password) return false;
    if (allowAsset && ASSET_HOSTS.has(url.hostname)) return true;
    return url.hostname === "github.com" && REPOSITORIES.some((repo) =>
        url.pathname.startsWith(`/adafruit/${repo}/releases/download/`) ||
        url.pathname.startsWith(`/adafruit/${repo}/releases/latest/download/`)
    );
}

export async function fetchRelease(url, { method = "GET", signal } = {}) {
    let current = new URL(url);
    for (let redirects = 0; redirects <= 5; redirects++) {
        if (!isAllowedUrl(current, redirects > 0)) throw new Error("Forbidden upstream URL.");
        const response = await fetch(current, {
            method,
            signal,
            redirect: "manual",
            headers: { "User-Agent": "cors-proxy-gcf" },
        });
        if (![301, 302, 303, 307, 308].includes(response.status)) return response;
        const location = response.headers.get("location");
        await response.body?.cancel();
        if (!location) throw new Error("Upstream redirect has no location.");
        current = new URL(location, current);
    }
    throw new Error("Too many upstream redirects.");
}
