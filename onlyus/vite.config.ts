import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  plugins: [
    react(),
    VitePWA({
      // Phase 7 switches this to injectManifest with a custom push handler.
      registerType: 'prompt',
      manifest: {
        name: 'ONLYUS',
        short_name: 'ONLYUS',
        description: 'A private space for two.',
        theme_color: '#0b0614',
        background_color: '#0b0614',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // App shell only. Never cache API, auth or storage responses.
        navigateFallbackDenylist: [/^\/api/, /supabase\.co/],
        runtimeCaching: []
      }
    })
  ]
});
