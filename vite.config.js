import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/",
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // API local (scripts/local-api-server.js en puerto 3001)
      "/api": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
        timeout: 120000,
        proxyTimeout: 120000,
      },
    },
  },
  build: {
    assetsDir: "images",
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            return "vendor";
          }
        },
      },
    },
  },
});
