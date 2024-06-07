import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import build_config from "./build-config.json";

// https://vitejs.dev/config/
export default build_config["single-file"]
    ? defineConfig({
          plugins: [
              react(),
              viteSingleFile(),
              {
                  name: "text-loader",
                  transform(code, id) {
                      if (id.slice(-3).toLowerCase() === ".md" || id.slice(-3).toLowerCase() === ".py") {
                          // For .md files, get the raw content
                          return `export default ${JSON.stringify(code)};`;
                      }
                  },
              },
          ],
          build: {
              copyPublicDir: false,
              outDir: "./release",
          },
      })
    : defineConfig({
          plugins: [
              react(),
              {
                  name: "text-loader",
                  transform(code, id) {
                      if (id.slice(-3).toLowerCase() === ".md" || id.slice(-3).toLowerCase() === ".py") {
                          // For .md files, get the raw content
                          return `export default ${JSON.stringify(code)};`;
                      }
                  },
              },
          ],
          base: "./",
      });
