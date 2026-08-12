// Aggregate soap-news HEADLINES from the RSS/Atom feeds listed in
// src/data/feeds/news-sources.json and write them to
// src/data/feeds/headlines.json for the /headlines/ page.
//
// This is a link-out aggregator, NOT a republisher: we store only a headline,
// its source name, a timestamp and a link to the original article. We never
// copy the article body. That keeps it firmly on the right side of copyright.
//
// Dependency-free: a small, defensive RSS/Atom parser (feeds are regular
// enough) avoids pulling in an XML library. No API keys.

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'feeds');
const SOURCES = path.join(DIR, 'news-sources.json');
const OUT = path.join(DIR, 'headlines.json');
const PER_FEED = 8;
const TOTAL = 40;

const SOAP_TAGS = [
  { soap: 'eastenders', re: /eastenders|albert square|walford|queen vic/i },
  { soap: 'coronation-street', re: /coronation street|corrie|weatherfield|rovers return/i },
  { soap: 'emmerdale', re: /emmerdale|the dales/i },
  { soap: 'hollyoaks', re: /hollyoaks/i },
];

function decode(s) {
  return (s || '')
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/\s+/g, ' ')
    .trim();
}

const tagOf = (s) => SOAP_TAGS.find((t) => t.re.test(s))?.soap;

function pick(block, tag) {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return m ? decode(m[1]) : '';
}

// Parse an RSS <item> or Atom <entry> block into {title, url, publishedAt}.
function parseEntries(xml) {
  const out = [];
  const blocks = [...xml.matchAll(/<(item|entry)\b[\s\S]*?<\/\1>/gi)].map((m) => m[0]);
  for (const b of blocks) {
    const title = pick(b, 'title');
    // RSS uses <link>URL</link>; Atom uses <link href="URL" .../>.
    let url = pick(b, 'link');
    if (!url) {
      const href = b.match(/<link[^>]*href="([^"]+)"[^>]*\/?>/i);
      if (href) url = decode(href[1]);
    }
    const date = pick(b, 'pubDate') || pick(b, 'published') || pick(b, 'updated') || pick(b, 'dc:date');
    // Google News RSS carries the publisher in a <source> element.
    const publisher = pick(b, 'source') || undefined;
    if (title && url) out.push({ title, url, publishedAt: date ? new Date(date).toISOString() : null, publisher });
  }
  return out;
}

async function main() {
  let config;
  try {
    config = JSON.parse(await readFile(SOURCES, 'utf8'));
  } catch (e) {
    console.error('headlines: cannot read news-sources.json:', e.message);
    process.exitCode = 1;
    return;
  }

  const feeds = config.feeds ?? [];
  const items = [];
  const usedSources = [];

  // Fetch all feeds in parallel; one slow or blocked feed never holds up the rest.
  await Promise.all(
    feeds.map(async (feed) => {
      try {
        const res = await fetch(feed.url, {
          headers: {
            'user-agent': 'Mozilla/5.0 (compatible; TV-Tattler/1.0; +https://tv-tattler.pages.dev)',
            accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
          },
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const xml = await res.text();
        let kept = 0;
        for (const e of parseEntries(xml)) {
          // A soap-specific feed tags every item to its show; a general feed
          // tags by what the headline names, and keeps only soap stories.
          const soap = feed.soap || tagOf(e.title);
          if (feed.soapSpecific === false && !soap) continue;
          const publisher = e.publisher || feed.name;
          // Google News (if ever used) appends " - Publisher"; trim it.
          let title = e.title;
          if (e.publisher && title.endsWith(` - ${e.publisher}`)) {
            title = title.slice(0, -(e.publisher.length + 3)).trim();
          }
          items.push({ title, url: e.url, publishedAt: e.publishedAt, source: publisher, soap });
          if (++kept >= PER_FEED) break;
        }
        if (kept) usedSources.push(feed.name);
        console.log(`headlines: ${feed.name} → ${kept}`);
      } catch (e) {
        console.warn(`headlines: ${feed.name} failed:`, e.message);
      }
    }),
  );

  if (items.length === 0) {
    console.log('headlines: nothing fetched — leaving file unchanged.');
    return;
  }

  // De-dupe by URL, newest first, capped.
  const byUrl = new Map();
  for (const it of items) if (!byUrl.has(it.url)) byUrl.set(it.url, it);
  const sorted = [...byUrl.values()]
    .sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''))
    .slice(0, TOTAL);

  const payload = {
    generatedAt: new Date().toISOString(),
    sources: usedSources,
    items: sorted,
  };
  await writeFile(OUT, JSON.stringify(payload, null, 2) + '\n');
  console.log(`headlines: wrote ${sorted.length} from ${usedSources.length} sources.`);
}

main().catch((e) => {
  console.error('headlines: unexpected error:', e);
  process.exitCode = 1;
});
