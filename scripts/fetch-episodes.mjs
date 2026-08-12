// Fetch this fortnight's soap episode air dates + official short synopses from
// the free TVmaze API and write them to src/data/feeds/episodes.json for the
// /whats-on/ page. No API key required.
//
// TVmaze data is free for personal/non-commercial use; a commercial site should
// review TVmaze's licensing. Summaries are TVmaze's own short descriptions and
// we link back to each episode on TVmaze.
//
// Safe by design: every show is fetched in its own try/catch, so one failure
// never blocks the others, and a total failure leaves the file unchanged.

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'feeds', 'episodes.json');
const WINDOW_DAYS = 14;

// Our show slug → TVmaze search term. Slugs match src/content/shows.
const SOAPS = [
  { slug: 'eastenders', q: 'EastEnders' },
  { slug: 'coronation-street', q: 'Coronation Street' },
  { slug: 'emmerdale', q: 'Emmerdale' },
  { slug: 'hollyoaks', q: 'Hollyoaks' },
];

async function get(url) {
  const res = await fetch(url, {
    headers: { accept: 'application/json', 'user-agent': 'TV-Tattler/1.0' },
    signal: AbortSignal.timeout(20000),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

const stripHtml = (s) =>
  (s || '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

function isoDay(d) {
  return d.toISOString().slice(0, 10);
}

async function main() {
  const today = isoDay(new Date());
  const end = new Date();
  end.setDate(end.getDate() + WINDOW_DAYS);
  const endDay = isoDay(end);

  const shows = [];
  for (const soap of SOAPS) {
    try {
      const show = await get(`https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(soap.q)}`);
      if (!show?.id) {
        console.warn(`episodes: no TVmaze match for ${soap.q}`);
        continue;
      }
      const eps = (await get(`https://api.tvmaze.com/shows/${show.id}/episodes`)) ?? [];
      const upcoming = eps
        .filter((e) => e.airdate && e.airdate >= today && e.airdate <= endDay)
        .sort((a, b) => (a.airstamp || a.airdate).localeCompare(b.airstamp || b.airdate))
        .map((e) => ({
          season: e.season ?? null,
          number: e.number ?? null,
          name: e.name || '',
          airdate: e.airdate,
          airtime: e.airtime || null,
          summary: stripHtml(e.summary).slice(0, 400),
          url: e.url || null,
        }));
      shows.push({
        slug: soap.slug,
        name: show.name,
        tvmazeUrl: show.url || null,
        episodes: upcoming,
      });
      console.log(`episodes: ${soap.slug} → ${upcoming.length} in next ${WINDOW_DAYS}d`);
    } catch (e) {
      console.warn(`episodes: ${soap.slug} failed:`, e.message);
    }
  }

  if (shows.length === 0) {
    console.log('episodes: nothing fetched — leaving file unchanged.');
    return;
  }

  // Preserve any shows we failed to fetch this run, so a transient error does
  // not blank out yesterday's good data.
  let prev = { shows: [] };
  try {
    prev = JSON.parse(await readFile(OUT, 'utf8'));
  } catch {
    /* first run */
  }
  const bySlug = new Map((prev.shows ?? []).map((s) => [s.slug, s]));
  for (const s of shows) bySlug.set(s.slug, s);
  const ordered = SOAPS.map((soap) => bySlug.get(soap.slug)).filter(Boolean);

  const payload = {
    generatedAt: new Date().toISOString(),
    source: 'TVmaze',
    windowDays: WINDOW_DAYS,
    shows: ordered,
  };
  await writeFile(OUT, JSON.stringify(payload, null, 2) + '\n');
  console.log(`episodes: wrote ${ordered.reduce((n, s) => n + s.episodes.length, 0)} episodes across ${ordered.length} shows.`);
}

main().catch((e) => {
  console.error('episodes: unexpected error:', e);
  process.exitCode = 1;
});
