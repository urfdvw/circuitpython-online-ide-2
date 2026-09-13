import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { hostedOffline } from "../build/hostedOffline.js";
import { harness } from "./helpers/harness.js";

const t = harness("hosted offline build");
t.watch();
const root = mkdtempSync(join(tmpdir(), "cpy-offline-build-"));
const directory = join(root, "public");
mkdirSync(directory);
try {
    const worker = readFileSync("public/service-worker.js", "utf8");
    writeFileSync(join(directory, "service-worker.js"), worker);
    mkdirSync(join(directory, "media"));
    writeFileSync(join(directory, "media/screenshot.png"), "picture");
    writeFileSync(join(directory, "grammar.wasm"), "grammar-v1");
    function build(shell = "shell-v1") {
        const plugin = hostedOffline();
        plugin.configResolved({ publicDir: directory, root });
        let output;
        plugin.generateBundle.call({ emitFile: (asset) => { output = asset; } }, {}, {
            "index.html": { type: "asset", fileName: "index.html", source: shell },
            "manifest-hash.json": { type: "asset", fileName: "manifest-hash.json", source: "{}" },
            "chunk-hash.js": { type: "chunk", fileName: "chunk-hash.js", code: "export default 1" },
        });
        return { plugin, output, manifest: JSON.parse(output.source.match(/^const OFFLINE_BUILD = (.+);$/m)[1]) };
    }
    const first = build();
    t.check("emits the registered service worker path", first.output.fileName === "service-worker.js");
    const paths = first.manifest.resources.map(({ path }) => path);
    t.check("includes shell, hashed outputs, grammar and nested public assets",
        ["index.html", "manifest-hash.json", "chunk-hash.js", "grammar.wasm", "media/screenshot.png"].every((path) => paths.includes(path)));
    t.check("does not precache the service worker itself", !paths.includes("service-worker.js"));
    t.check("shell integrity describes its actual bytes", first.manifest.resources.find(({ path }) => path === "index.html").integrity ===
        "sha256-" + createHash("sha256").update("shell-v1").digest("base64"));
    t.check("unchanged builds have the same cache revision", build().manifest.version === first.manifest.version);
    writeFileSync(join(directory, ".DS_Store"), "Finder metadata");
    writeFileSync(join(directory, "media/.DS_Store"), "nested Finder metadata");
    mkdirSync(join(directory, ".hidden"));
    writeFileSync(join(directory, ".hidden/visible-name.png"), "not published");
    const withMetadata = build();
    t.check("dotfiles and hidden directories do not enter the manifest", !withMetadata.manifest.resources.some(({ path }) =>
        path.split("/").some((part) => part.startsWith("."))));
    t.check("adding Finder metadata does not change the cache revision", withMetadata.manifest.version === first.manifest.version);
    writeFileSync(join(directory, ".DS_Store"), "changed Finder metadata");
    t.check("changing Finder metadata does not change the cache revision", build().manifest.version === first.manifest.version);
    t.check("shell changes advance the cache revision", build("shell-v2").manifest.version !== first.manifest.version);
    writeFileSync(join(directory, "grammar.wasm"), "grammar-v2");
    const grammar = build();
    t.check("public asset changes advance the cache revision", grammar.manifest.version !== first.manifest.version);
    writeFileSync(join(directory, "service-worker.js"), worker + "\n// changed worker\n");
    t.check("worker changes advance the cache revision", build().manifest.version !== grammar.manifest.version);

    // Model a Pages checkout: local files can exist without being published through Git.
    const docs = join(root, "docs");
    mkdirSync(docs);
    const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" });
    git("init", "--quiet");
    writeFileSync(join(root, ".gitignore"), ".DS_Store\n*.local\n");
    for (const { path } of first.manifest.resources) {
        mkdirSync(dirname(join(docs, path)), { recursive: true });
        writeFileSync(join(docs, path), "published resource");
    }
    writeFileSync(join(docs, "service-worker.js"), first.output.source);
    writeFileSync(join(docs, ".DS_Store"), "ignored local artifact");
    git("add", "docs");
    const checkPublication = (result) => {
        try { result.plugin.writeBundle({ dir: docs }); return ""; }
        catch (error) { return error.message; }
    };
    t.check("tracked deployment passes even with local ignored metadata", checkPublication(first) === "");
    git("rm", "--cached", "docs/chunk-hash.js");
    t.check("untracked hashed build output fails publication validation", checkPublication(first).includes("chunk-hash.js"));
    git("add", "docs/chunk-hash.js");
    t.check("staging the missing deployment file restores validation", checkPublication(first) === "");
    // Assert ignored non-dotfiles cannot introduce another missing-resource dependency.
    writeFileSync(join(directory, "extra.local"), "ignored public resource");
    const ignored = build();
    writeFileSync(join(docs, "extra.local"), "ignored public resource");
    t.check("ignored non-dotfile fails publication validation", checkPublication(ignored).includes("extra.local"));
    ignored.plugin.writeBundle({ dir: join(directory, "temporary-output") });
    t.check("redirected validation builds do not require staged artifacts", true);
} catch (error) { t.fail("unexpected error", error); }
finally { rmSync(root, { recursive: true, force: true }); }
t.done();
