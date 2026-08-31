import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.indexOf("node_modules") === -1) return;
          if (id.indexOf("/react-dom/") !== -1 || id.indexOf("/react/") !== -1 || id.indexOf("scheduler") !== -1) {
            return "react-vendor";
          }
          if (id.indexOf("/lucide-react/") !== -1) {
            return "icon-vendor";
          }
          // Leave remaining dependencies to Rollup. Mermaid is loaded only by
          // Markdown previews that contain a Mermaid block and must not become
          // an eagerly preloaded application vendor chunk.
          return;
        },
      },
    },
  },
  server: {
    host: "0.0.0.0",
    port: 8021,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8022",
        changeOrigin: true,
      },
    },
  },
});
