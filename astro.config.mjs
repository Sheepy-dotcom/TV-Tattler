// @ts-check
import { defineConfig } from 'astro/config';

// TV Tattler — static output, deploying to Cloudflare Pages.
// Zero client-side JS by default; islands only added where a feature needs them.
export default defineConfig({
  site: 'https://tvtattler.co.uk',
  output: 'static',
  trailingSlash: 'always',
});
