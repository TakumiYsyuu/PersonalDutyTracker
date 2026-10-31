import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Deep Sea base color from Infos.md
const THEME = "#0d1b2a";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // "prompt": a new version waits until the user taps "Update now", so a
      // reload never wipes a half-filled duty or deposit form.
      registerType: "prompt",
      injectRegister: false, // registration is done by useRegisterSW in PwaStatus
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        id: "/",
        name: "Taláan",
        short_name: "Taláan",
        description: "Personal duty, salary, and savings tracker.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait-primary",
        theme_color: THEME,
        background_color: THEME,
        lang: "en-PH",
        categories: ["finance", "productivity"],
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "pwa-maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // The app shell: every built asset is precached on first visit.
        globPatterns: ["**/*.{js,css,html,svg,png,ico,webmanifest}"],
        // Any page navigation falls back to the cached shell, which is what
        // lets the app open with no connection.
        navigateFallback: "/index.html",
        cleanupOutdatedCaches: true,
        // Only static fonts are cached at runtime. There is no backend or API,
        // and nothing user-specific is ever put in a service-worker cache
        // (duties and goals live in LocalStorage).
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === "https://fonts.googleapis.com",
            handler: "StaleWhileRevalidate",
            options: { cacheName: "google-fonts-css" },
          },
          {
            urlPattern: ({ url }) => url.origin === "https://fonts.gstatic.com",
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-files",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
});
