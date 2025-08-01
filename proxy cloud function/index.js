// index.js  ─ Cloud Run / Cloud Functions 入口
import { Readable } from "node:stream";
import functions from "@google-cloud/functions-framework";

functions.http("corsProxy", async (req, res) => {
    /* ====== 1. CORS Headers ====== */
    res.set({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    });
    if (req.method === "OPTIONS") {
        res.status(204).end();
        return;
    }

    /* ====== 2. 解析 & 校验目标 URL ====== */
    const target = req.query.url;
    if (!target) {
        res.status(400).send('Missing "url" query parameter.');
        return;
    }

    let parsed;
    try {
        parsed = new URL(target);
    } catch {
        res.status(400).send("Invalid target URL.");
        return;
    }

    // ★★ 2.1 权限机制：仅允许两个特定仓库 ★★
    const allowedPrefixes = ["/adafruit/CircuitPython_Community_Bundle/", "/adafruit/Adafruit_CircuitPython_Bundle/"];
    const isAllowed =
        parsed.hostname === "github.com" && allowedPrefixes.some((prefix) => parsed.pathname.startsWith(prefix));

    if (!isAllowed) {
        res.status(403).send("Forbidden: target not in allowed GitHub repositories.");
        return;
    }

    /* ====== 3. 转发 ====== */
    try {
        const up = await fetch(parsed.href, {
            redirect: "follow",
            headers: { "User-Agent": "cors-proxy-gcf" },
        });

        ["content-type", "content-disposition", "content-length", "content-encoding"].forEach((h) => {
            const v = up.headers.get(h);
            if (v) res.setHeader(h, v);
        });

        res.status(up.status);
        const stream = up.body?.pipe ? up.body : Readable.fromWeb(up.body);
        stream.pipe(res);
    } catch (err) {
        console.error("Proxy error:", err);
        res.status(502).send("Upstream fetch failed.");
    }
});
