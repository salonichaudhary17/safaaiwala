import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "SafaaiWala",
        short_name: "SafaaiWala",
        description: "Formal recycling access for informal e-waste collectors",
        theme_color: "#0F6E56",
        background_color: "#F6F5F1",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png}"],
        runtimeCaching: [
          {
            // Matches the API path on whatever origin it's actually served
            // from (localhost in dev, your deployed backend URL in prod) -
            // a hardcoded localhost pattern here would silently break
            // offline caching the moment you deploy.
            urlPattern: /\/api\/(materials|recyclers|price)/,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "safaaiwala-api-cache" },
          },
        ],
      },
    }),
  ],
  server: { port: 5173 },
});
