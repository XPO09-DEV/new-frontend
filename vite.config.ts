import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const backend = "http://127.0.0.1:4000";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/auth": { target: backend, changeOrigin: true },
      "/me": { target: backend, changeOrigin: true },
      "/home": { target: backend, changeOrigin: true },
      "/wallet": { target: backend, changeOrigin: true },
      "/alias": { target: backend, changeOrigin: true },
      "/rates": { target: backend, changeOrigin: true },
      "/payments": { target: backend, changeOrigin: true },
      "/withdraw": { target: backend, changeOrigin: true },
      "/contacts": { target: backend, changeOrigin: true },
      "/bills": { target: backend, changeOrigin: true },
      "/mandates": { target: backend, changeOrigin: true },
      "/bridge": { target: backend, changeOrigin: true },
      "/assets": { target: backend, changeOrigin: true },
      "/health": { target: backend, changeOrigin: true },
    },
  },
});
