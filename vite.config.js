import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// https://vite.dev/config/
export default defineConfig({
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
});
