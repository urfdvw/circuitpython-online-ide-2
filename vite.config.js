import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import build_config from "./build-config.json";

// https://vitejs.dev/config/
export default build_config["single-file"]
    ? defineConfig({
          plugins: [react(), viteSingleFile()],
          build: {
              copyPublicDir: false,
              outDir: "./release",
          },
      })
    : defineConfig({
          plugins: [react()],
          base: "./",
      });
