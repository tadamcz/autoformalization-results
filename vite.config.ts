import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  // the exporter's output is served as-is: data/index.json -> /index.json, etc.
  publicDir: "data",
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1500,
  },
});
