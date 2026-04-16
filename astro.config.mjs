import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import keystatic from '@keystatic/astro';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://example.ru',
  integrations: [sitemap(), react(), keystatic()],
  trailingSlash: 'always',
  adapter: vercel(),
  vite: {
    resolve: {
      alias: {
        '@keystatic/astro/internal/keystatic-api.js': fileURLToPath(
          new URL('./src/keystatic-api-override.js', import.meta.url)
        ),
      },
    },
  },
});
