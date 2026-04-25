import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite proxies /shopify/* → Shopify Admin REST API directly (avoids CORS)
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/shopify": {
        target: "https://basant-kothi-online.myshopify.com",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/shopify/, "/admin/api/2024-07"),
      },
    },
  },
});
