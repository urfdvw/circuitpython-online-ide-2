import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

// Run after single-file inlining so the manifest describes the files actually published.
export function hostedOffline() {
    let publicDir;
    let root;
    let resources;
    return {
        name: "hosted-offline",
        enforce: "post",
        configResolved(config) { publicDir = config.publicDir; root = config.root; },
        generateBundle(_, bundle) {
            const files = new Map();
            function collect(directory, prefix = "") {
                for (const entry of readdirSync(directory, { withFileTypes: true })) {
                    // Finder metadata and hidden directories are not deployment assets.
                    if (entry.name.startsWith(".")) continue;
                    const path = prefix + entry.name;
                    if (entry.isDirectory()) collect(join(directory, entry.name), path + "/");
                    else if (entry.isFile() && path !== "service-worker.js") {
                        files.set(path, readFileSync(join(directory, entry.name)));
                    }
                }
            }
            collect(publicDir);
            for (const asset of Object.values(bundle)) {
                files.set(asset.fileName, asset.type === "chunk" ? asset.code : asset.source);
            }
            if (!files.has("index.html")) throw new Error("Hosted offline build requires index.html.");
            resources = [...files].sort(([a], [b]) => a.localeCompare(b)).map(([path, content]) => ({
                path,
                integrity: "sha256-" + createHash("sha256").update(content).digest("base64"),
            }));
            const template = readFileSync(join(publicDir, "service-worker.js"), "utf8");
            const version = createHash("sha256").update(template).update(JSON.stringify(resources)).digest("hex");
            const marker = "/* OFFLINE_BUILD */ null";
            if (!template.includes(marker)) throw new Error("Service worker is missing its build manifest marker.");
            this.emitFile({
                type: "asset", fileName: "service-worker.js",
                source: template.replace(marker, JSON.stringify({ version, resources })),
            });
        },
        writeBundle(options) {
            // Only docs/ is published from Git. Temporary validation outputs need no staging.
            if (resolve(options.dir) !== resolve(root, "docs")) return;
            const tracked = new Set(execFileSync("git", ["ls-files", "--cached", "-z", "--", "."], {
                cwd: options.dir, encoding: "utf8",
            }).split("\0"));
            const missing = [...resources.map(({ path }) => path), "service-worker.js"]
                .filter((path) => !tracked.has(path));
            if (missing.length) {
                throw new Error("Offline release requires files not tracked in docs/: " + missing.join(", ") +
                    ". Stage the intended deployment files and rebuild, or remove unintended resources from public/. " +
                    "Check .gitignore if a required file cannot be staged.");
            }
        },
    };
}
