// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://kilc.co.uk',
  integrations: [tailwind(), sitemap({
    filter: (page) => !page.includes('/admin'),
  })],
  i18n: {
    locales: ['en', 'zh', 'es', 'ms'],
    defaultLocale: 'en',
    routing: {
      prefixDefaultLocale: false,
    },
  },
});