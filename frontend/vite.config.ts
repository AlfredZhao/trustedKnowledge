import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const allowedHosts = (env.TRUSTED_KNOWLEDGE_VITE_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean);

  return {
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
      host: "127.0.0.1",
      port: 8021,
      strictPort: true,
      allowedHosts,
      proxy: {
        "/api": {
          target: "http://127.0.0.1:8022",
          changeOrigin: true,
        },
      },
    },
  };
});
