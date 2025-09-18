/// <reference types="node" />
import { defineConfig, loadEnv, type UserConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import type { ServerOptions } from 'https';
import { VitePWA } from 'vite-plugin-pwa'; // ← NYT

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');

  const useHttps   = env.VITE_DEV_HTTPS === '1';
  const exposeHost = env.VITE_DEV_HOST === '1';

  const httpsOpt: ServerOptions | undefined = useHttps ? {} : undefined;

  const config: UserConfig = {
    plugins: [
      react(),
      ...(useHttps ? [basicSsl()] : []),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['vite.svg', 'favicon.svg', 'apple-touch-icon.png'],
        manifest: {
          name: 'Museum Moss Naturvandring',
          short_name: 'Naturvandring',
          start_url: '/',
          display: 'standalone',
          background_color: '#f3f6fb',
          theme_color: '#2fb36d',
          // Hvis du IKKE lægger ikon-filer i /public endnu, kan du midlertidigt
          // kommentere "icons" ud. Ellers opret filerne navngivet som nedenfor.
          icons: [
            { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
            { src: '/pwa-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
          ]
        },
        workbox: {
          // Precacher kun JS/CSS/HTML/ico/svg – men IGNORÉR alt i /img/
          globPatterns: ['**/*.{js,css,html,ico,svg,png}'],
          globIgnores: ['**/img/**'],            // <- vigtigt: store galleri-billeder precaches ikke
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024, // lidt luft til evt. store ikoner (valgfrit)

          runtimeCaching: [
            // Rutedata
            {
              urlPattern: ({ url }) =>
                url.pathname.endsWith('/routes.json') || url.pathname.endsWith('/pois.json'),
              handler: 'StaleWhileRevalidate',
              options: { cacheName: 'content' }
            },
            // Billeder i /img – cache first (hurtigt i felten)
            {
              urlPattern: ({ url }) => url.pathname.startsWith('/img/'),
              handler: 'CacheFirst',
              options: {
                cacheName: 'images',
                expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 }
              }
            },
            // OSM fliser
            {
              urlPattern: /^https:\/\/(?:[abc]\.)?tile\.openstreetmap\.org\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'osm-tiles',
                expiration: { maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 14 }
              }
            }
          ]
        }
      })
    ],
    server: {
      https: httpsOpt,             // ← ikke boolean
      host: exposeHost ? true : false,
    },
  };

  return config;
});
