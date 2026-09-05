import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Horaires TAG — Grenoble',
        short_name: 'Horaires TAG',
        description: 'Prochains passages en temps réel du réseau M (TAG) à Grenoble.',
        theme_color: '#2563eb',
        background_color: '#f8fafc',
        display: 'standalone',
        start_url: '/',
        lang: 'fr',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: '/icons/icon-maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Les prochains passages sont du temps réel : jamais servis depuis le cache.
        runtimeCaching: [
          {
            urlPattern: /\/api\/routers\/default\/index\/clusters\/.*\/stoptimes/,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /\/api\/dyn\/evt\/json/,
            handler: 'NetworkOnly',
          },
          {
            // Arrêts/lignes : rarement modifiés, on sert le cache tout en revalidant en fond.
            urlPattern: /data\.mobilites-m\.fr\/api\/(points|routers\/default\/index\/routes)/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'mobilites-m-reference-data' },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
})
