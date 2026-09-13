import { createTransferTimeout, pipeRelease } from "./transfer.js";
import functions from "@google-cloud/functions-framework";
import { fetchRelease, isAllowedUrl } from "./proxy.js";

functions.http("corsProxy", async (req, res) => {
    res.set({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    });
    if (req.method === "OPTIONS") {
        res.status(204).end();
        return;
    }
    if (!["GET", "HEAD"].includes(req.method)) {
        res.setHeader("Allow", "GET, HEAD, OPTIONS");
        res.status(405).send("Method not allowed.");
        return;
    }

    let url;
    try {
        if (typeof req.query.url !== "string") throw new Error("Missing URL");
        url = new URL(req.query.url);
    } catch {
        res.status(400).send('A valid "url" query parameter is required.');
        return;
    }
    if (!isAllowedUrl(url)) {
        res.status(403).send("Forbidden: expected a release download from an allowed GitHub repository.");
        return;
    }

    const controller = new AbortController();
    const timeout = createTransferTimeout(controller);
    const disconnect = () => controller.abort();
    res.on("close", disconnect);
    try {
        const upstream = await fetchRelease(url, { method: req.method, signal: controller.signal });
        timeout.progress();
        // Fetch decodes compressed bodies; forwarding encoded lengths/encodings corrupts downloads.
        for (const header of ["content-type", "content-disposition"]) {
            const value = upstream.headers.get(header);
            if (value) res.setHeader(header, value);
        }
        res.status(upstream.status);
        if (!upstream.body || req.method === "HEAD") {
            res.end();
        } else {
            await pipeRelease(upstream.body, res, { signal: controller.signal, progress: timeout.progress });
        }
    } catch (error) {
        console.error("Proxy error:", error);
        if (!res.headersSent && !res.destroyed) res.status(502).send("Upstream fetch failed.");
        else res.destroy();
    } finally {
        timeout.dispose();
        res.off("close", disconnect);
    }
});
