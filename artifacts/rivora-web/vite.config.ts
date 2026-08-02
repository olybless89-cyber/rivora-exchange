import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@workspace/api-client-react": path.resolve(__dirname, "./src/lib/api-client"),
    },
  },
  build: {
    outDir: "dist/public",
  },
});
