import type { APIRoute } from 'astro';
import { site, adsEnabled } from '../config/site';

// ads.txt tells ad exchanges which accounts are authorised to sell this site's
// inventory — Google requires it for AdSense. It's generated from the configured
// publisher id, so once PUBLIC_ADSENSE_CLIENT is set the correct line appears
// automatically. Before that it's an empty (but valid) file.
export const GET: APIRoute = () => {
  const pub = site.adsenseClient.replace(/^ca-/, ''); // ads.txt wants "pub-…"
  const body = adsEnabled
    ? `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`
    : '# ads.txt — set PUBLIC_ADSENSE_CLIENT to publish your AdSense line here.\n';
  return new Response(body, {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
};
