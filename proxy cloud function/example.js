async function fetchWithProxy(targetUrl) {
    // 已部署的 Cloud Run 代理端点
    const PROXY_ENDPOINT = "https://cpy-lib-proxy-663297601284.us-central1.run.app";

    // 发起请求（代理会加上 Access-Control-Allow-Origin 头，消除 CORS）
    const resp = await fetch(`${PROXY_ENDPOINT}?url=${encodeURIComponent(targetUrl)}`);

    if (!resp.ok) {
        throw new Error(`Failed to fetch: ${resp.status} ${resp.statusText}`);
    }

    return resp;
}
