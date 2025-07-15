import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import mkcert from 'vite-plugin-mkcert';

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
        mkcert(),
    ],
    optimizeDeps: {
        include: [
            '@emotion/react',
            '@emotion/styled',
            '@mui/material/Tooltip' // or other MUI components
        ],
    },
    build: {
        outDir: "./docs",
    },
    server: {
        https: true,
        host: true, // or specify a hostname like 'localhost'
    },
});
