import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/", // Añade esta línea
  plugins: [react()],
  build: {
    assetsDir: "images", // Añade esta línea
    // Resto de tu configuración existente
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
