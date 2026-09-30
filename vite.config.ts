/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// De repository heet "intervalfit", dus GitHub Pages serveert de app op /intervalfit/.
const BASE = '/intervalfit/';

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    VitePWA({
      // Updates nooit automatisch toepassen: de app vraagt het zelf op een veilig moment
      // (nooit midden in een workout).
      registerType: 'prompt',
      injectRegister: false,
      pwaAssets: { config: true, overrideManifestIcons: true },
      manifest: {
        id: BASE,
        name: 'IntervalFit',
        short_name: 'IntervalFit',
        description: 'Jouw persoonlijke interval- en tabata-trainingen, met een eigen tijd per oefening.',
        lang: 'nl',
        dir: 'ltr',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        orientation: 'any',
        background_color: '#F3FAF7',
        theme_color: '#F3FAF7',
        categories: ['health', 'fitness', 'sports'],
      },
      workbox: {
        // Het manifest voegt de plugin zelf al toe; niet nog eens opnemen (dubbele regel = mislukte installatie).
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Lettertekens voor Vietnamees/Cyrillisch zijn niet nodig voor een Nederlandstalige app.
        // Opstartschermen haalt iOS zelf op bij het installeren; niet in de offline-cache (scheelt ruim 1 MB).
        globIgnores: ['**/*-vietnamese-*', '**/*-cyrillic*', '**/splash/**'],
        navigateFallback: `${BASE}index.html`,
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
