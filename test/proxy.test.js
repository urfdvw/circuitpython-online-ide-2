import { harness } from "./helpers/harness.js";
import { fetchRelease, isAllowedUrl } from "../proxy cloud function/proxy.js";
const t = harness("release proxy validation");
t.watch();
const release = "https://github.com/adafruit/Adafruit_CircuitPython_Bundle/releases/download/1/bundle.zip";
const previousFetch = globalThis.fetch;
try {
    t.check("release download allowed", isAllowedUrl(new URL(release)));
    for (const url of [release.replace("https:", "http:"), release.replace("github.com", "github.com:444"),
        release.replace("github.com", "user:pass@github.com"), release.replace("/releases/", "/issues/"),
        "https://github.com/adafruit/other/releases/download/1/a.zip", "https://127.0.0.1/internal"]) {
        t.check(`rejects ${url}`, !isAllowedUrl(new URL(url)));
    }
    let calls = 0;
    globalThis.fetch = async () => { calls++; return new Response(null, {
        status: 302, headers: { location: "http://169.254.169.254/computeMetadata/v1/" },
    }); };
    try { await fetchRelease(release); t.check("unsafe redirect rejected", false); }
    catch { t.check("unsafe redirect is never fetched", calls === 1); }
    calls = 0;
    globalThis.fetch = async (url, options) => {
        calls++;
        t.check("HEAD is forwarded", options.method === "HEAD");
        return calls === 1 ? new Response(null, { status: 302,
            headers: { location: "https://release-assets.githubusercontent.com/github-production-release-asset/test" },
        }) : new Response(null, { status: 200 });
    };
    t.check("official asset redirect succeeds", (await fetchRelease(release, { method: "HEAD" })).status === 200 && calls === 2);
    calls = 0;
    globalThis.fetch = async () => { calls++; return new Response(null, { status: 302, headers: { location: release } }); };
    try { await fetchRelease(release); t.check("redirect limit enforced", false); }
    catch { t.check("redirect loop is bounded", calls === 6); }
} catch (error) { t.fail("unexpected error", error); }
finally { globalThis.fetch = previousFetch; }
t.done();
