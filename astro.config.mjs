import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import keystatic from './src/integrations/keystatic-custom.mjs';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://example.ru',
  integrations: [sitemap(), react(), keystatic()],
  trailingSlash: 'always',
  adapter: vercel(),
});
