import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import { readFileSync, readdirSync } from "node:fs";

const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

const mimeTypes = {
    ".wasm": "application/wasm",
    ".png": "image/png",
    ".svg": "image/svg+xml",
};

// Read a file from `public/` as a data URI, so it can be embedded in the portable build.
function publicFileAsDataUri(pathInPublic) {
    const url = new URL(`./public/${pathInPublic}`, import.meta.url);
    const mimeType = mimeTypes[pathInPublic.slice(pathInPublic.lastIndexOf("."))];
    if (!mimeType) {
        throw new Error(`No mime type known for ${pathInPublic}, add it to \`mimeTypes\``);
    }
    return `data:${mimeType};base64,${readFileSync(url).toString("base64")}`;
}

// The portable target ships as one html file that can be downloaded and opened on its own, so
// everything it fetches at runtime from `public/` has to be embedded as a data URI. `viteSingleFile`
// only inlines JS and CSS, which is why this runs after it (plugin array order decides the order
// within `enforce: "post"`) and rewrites the remaining references in the finished html.
//
// Anything new that references a `public/` asset by path needs a rule here as well.
function portableSingleHtml() {
    const fileName = `circuitpython-online-ide-${version}.html`;
    return {
        name: "portable-single-html",
        enforce: "post",
        generateBundle(_, bundle) {
            for (const [key, chunk] of Object.entries(bundle)) {
                // Only the html survives; `manifest-<hash>.json` (emitted from the manifest link
                // in index.html) is dropped along with the link tag below.
                if (!key.endsWith(".html")) {
                    delete bundle[key];
                    continue;
                }

                let html = String(chunk.source);

                // Fetched by `src/utilFunctions/astUtils.js` for syntax checking. `fetch` reads
                // data URIs, so the source stays unchanged.
                html = html.replaceAll("./tree-sitter-python.wasm", publicFileAsDataUri("tree-sitter-python.wasm"));

                // Screenshots on the product page. Replaced by exact file name rather than by
                // the `./media/` prefix, so prose that mentions the folder is left alone.
                for (const image of readdirSync(new URL("./public/media", import.meta.url))) {
                    html = html.replaceAll(`./media/${image}`, publicFileAsDataUri(`media/${image}`));
                }

                // The 192px png instead of `blinka.svg`: identical at favicon size, 22 KB not 280 KB.
                html = html.replace(
                    /<link rel="icon"[^>]*>/,
                    `<link rel="icon" type="image/png" href="${publicFileAsDataUri("blinka-192.png")}" />`
                );

                // A PWA manifest is meaningless for a downloaded file.
                html = html.replace(/[ \t]*<link rel="manifest"[^>]*>\n?/, "");

                chunk.source = html;
                delete bundle[key];
                chunk.fileName = fileName;
                bundle[fileName] = chunk;
            }
        },
    };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
    // `docs/` is the GitHub Pages site; every other target builds into `dist/`.
    const portable = mode === "portable";
    return {
        define: {
            "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? "development"),
            "process.env.DRAGGABLE_DEBUG": "false",
        },
        plugins: [
            react(),
            viteSingleFile(),
            {
                name: "text-loader",
                transform(code, id) {
                    if (id.slice(-3).toLowerCase() === ".md" || id.slice(-3).toLowerCase() === ".py") {
                        // For .md and .py files, get the raw content
                        return `export default ${JSON.stringify(code)};`;
                    }
                },
            },
            ...(portable ? [portableSingleHtml()] : []),
        ],
        optimizeDeps: {
            include: [
                '@emotion/react',
                '@emotion/styled',
                '@mui/material/Tooltip' // or other MUI components
            ],
        },
        build: portable
            ? {
                  outDir: "./dist",
                  // Keep `dist/` down to the current version's file only
                  emptyOutDir: true,
                  // Everything is embedded in the html
                  copyPublicDir: false,
              }
            : {
                  outDir: "./docs",
              },
    };
});
