import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    // entry pages are fetched as JSON at runtime; the bundle itself stays small
    chunkSizeWarningLimit: 1500,
  },
});
