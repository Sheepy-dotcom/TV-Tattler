// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// TV Tattler — static output, deploying to Cloudflare Pages.
// Zero client-side JS by default; islands only added where a feature needs them.
export default defineConfig({
  site: 'https://tvtattler.com',
  output: 'static',
  trailingSlash: 'always',
  integrations: [
    sitemap({
      // Keep utility endpoints (data feeds) out of the sitemap.
      filter: (page) => !page.includes('/search-index.json') && !page.includes('/rss.xml'),
    }),
  ],
});
