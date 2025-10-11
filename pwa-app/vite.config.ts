/// <reference types="node" />
import { defineConfig, loadEnv, type UserConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import type { ServerOptions } from 'https';
import { VitePWA } from 'vite-plugin-pwa';

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
          icons: [
            { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
            { src: '/pwa-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
          ]
        },
        workbox: {
          // Precacher kun JS/CSS/HTML/ico/svg/png – men ignorerer alt i /img/
          globPatterns: ['**/*.{js,css,html,ico,svg,png}'],
          globIgnores: ['**/img/**'],
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
          cleanupOutdatedCaches: true,

          runtimeCaching: [
            // Rutedata: routes.json + rute-splittede POIs /data/pois/route-*.json
            {
              urlPattern: ({ url }) =>
                url.pathname.endsWith('/data/routes.json') ||
                /\/data\/pois\/route-\d+\.json$/.test(url.pathname),
              handler: 'StaleWhileRevalidate',
              options: { cacheName: 'content' }
            },
            // Billeder i /img – cache first
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
      https: httpsOpt,
      host: exposeHost ? true : false,
    },
  };

  return config;
});
