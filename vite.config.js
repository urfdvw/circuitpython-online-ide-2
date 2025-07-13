import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react(),
        viteSingleFile(),
        {
            name: "text-loader",
            transform(code, id) {
                if (id.slice(-3).toLowerCase() === ".md") {
                    // For .md files, get the raw content
                    return `export default ${JSON.stringify(code)};`;
                }
            },
        },
    ],
    build: {
        outDir: "./docs",
    },
});
