// Generate the default social-share card (Open Graph / Twitter) at 1200x630 —
// the size Facebook, X and others expect, so shared links show a clean preview.
// Run with: npm run og
import sharp from 'sharp';
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#17122A"/>
      <stop offset="0.55" stop-color="#2a1650"/>
      <stop offset="1" stop-color="#3b1a4d"/>
    </linearGradient>
    <linearGradient id="tv" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ff1e63"/>
      <stop offset="1" stop-color="#7b2ff7"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="0" y="0" width="1200" height="10" fill="url(#tv)"/>
  <g font-family="Arial, Helvetica, DejaVu Sans, sans-serif">
    <rect x="90" y="238" width="150" height="120" rx="22" fill="url(#tv)"/>
    <text x="165" y="326" font-size="86" font-weight="800" fill="#ffffff" text-anchor="middle">TV</text>
    <text x="262" y="326" font-size="92" font-weight="800" fill="#ffffff">Tattler</text>
    <text x="94" y="410" font-size="40" font-weight="600" fill="#e9d8ff">Soap spoilers, telly news &amp; what&#8217;s on.</text>
    <text x="94" y="470" font-size="26" font-weight="500" fill="#b79ddb">EastEnders &#183; Coronation Street &#183; Emmerdale &#183; Hollyoaks</text>
  </g>
  <g>
    <circle cx="1030" cy="150" r="16" fill="#ff1e63"/>
    <circle cx="1075" cy="150" r="16" fill="#7b2ff7"/>
    <circle cx="1120" cy="150" r="16" fill="#00c2c7"/>
  </g>
</svg>`;
await sharp(Buffer.from(svg)).jpeg({ quality: 88, mozjpeg: true }).toFile('public/images/og-default.jpg');
const meta = await sharp('public/images/og-default.jpg').metadata();
console.log('og image:', meta.width + 'x' + meta.height, Math.round((await import('node:fs')).statSync('public/images/og-default.jpg').size/1024)+'KB');
