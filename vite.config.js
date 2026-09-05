import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // We already ship our own public/manifest.webmanifest + the
      // <link> tags in index.html — this plugin's job here is just
      // generating a correct service worker at build time (with a
      // precache manifest that matches whatever hashed filenames this
      // particular build produces), not managing the manifest too.
      manifest: false,
      injectRegister: null, // we register it ourselves in main.jsx
      registerType: 'autoUpdate',
      workbox: {
        // App shell: precache the built JS/CSS/HTML/icons so the app
        // still loads with no connection — this is the actual fix for
        // the "needs a live connection just to load" gap. Data itself
        // (orders, products) is intentionally NOT cached here — an
        // order screen showing stale/incorrect status offline would be
        // actively misleading, worse than a normal "you're offline" state.
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // Product photos come from Supabase Storage, on whatever
            // project URL the deployer configures — match by path
            // rather than a hardcoded host.
            urlPattern: ({ url }) => url.pathname.includes('/storage/v1/object/public/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'product-photos',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
      },
    }),
  ],
})
