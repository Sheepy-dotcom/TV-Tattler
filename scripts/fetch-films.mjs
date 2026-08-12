// Fetch upcoming & current UK cinema releases from The Movie Database (TMDB)
// and write them to src/data/feeds/films.json for the /films/ page.
//
// TMDB is free but requires a key. Set ONE of these in the environment
// (a GitHub Actions secret in CI):
//   TMDB_API_KEY   — a v3 API key            (passed as ?api_key=)
//   TMDB_BEARER    — a v4 Read Access Token  (passed as a Bearer header)
//
// Attribution: this product uses the TMDB API but is not endorsed or certified
// by TMDB. Poster images are served from TMDB's own image CDN.
//
// Safe by design: with no key it logs and exits 0 without touching the file, so
// a build or scheduled run never fails just because the key is absent.

import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'feeds', 'films.json');
const REGION = 'GB';
const IMG_BASE = 'https://image.tmdb.org/t/p/w500';
const MAX_FILMS = 24;

const apiKey = process.env.TMDB_API_KEY;
const bearer = process.env.TMDB_BEARER;

function api(pathname, params = {}) {
  const url = new URL(`https://api.themoviedb.org/3${pathname}`);
  url.searchParams.set('language', 'en-GB');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  if (apiKey) url.searchParams.set('api_key', apiKey);
  return url;
}

async function get(url) {
  const res = await fetch(url, {
    headers: {
      accept: 'application/json',
      'user-agent': 'TV-Tattler/1.0 (+https://tv-tattler.pages.dev)',
      ...(bearer ? { authorization: `Bearer ${bearer}` } : {}),
    },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url.pathname}`);
  return res.json();
}

// GB age certification (e.g. "12A", "15") from the per-film release-dates record.
async function certificationFor(id) {
  try {
    const data = await get(api(`/movie/${id}/release_dates`));
    const gb = (data.results ?? []).find((r) => r.iso_3166_1 === REGION);
    const cert = gb?.release_dates?.map((d) => d.certification).find((c) => c);
    return cert || undefined;
  } catch {
    return undefined;
  }
}

async function main() {
  if (!apiKey && !bearer) {
    console.log('films: no TMDB_API_KEY / TMDB_BEARER set — skipping (file left unchanged).');
    return;
  }

  // Genre id → name map, so we can show human-readable genres.
  const genreMap = new Map();
  try {
    const g = await get(api('/genre/movie/list'));
    for (const { id, name } of g.genres ?? []) genreMap.set(id, name);
  } catch (e) {
    console.warn('films: genre list failed:', e.message);
  }

  // Upcoming releases for the UK, plus what's currently in cinemas.
  const seen = new Map();
  for (const endpoint of ['/movie/upcoming', '/movie/now_playing']) {
    for (const page of [1, 2]) {
      try {
        const data = await get(api(endpoint, { region: REGION, page }));
        for (const m of data.results ?? []) {
          if (!m.release_date) continue;
          if (!seen.has(m.id)) seen.set(m.id, m);
        }
      } catch (e) {
        console.warn(`films: ${endpoint} p${page} failed:`, e.message);
      }
    }
  }

  // Keep releases from a week ago onward (so "just out" stays listed briefly),
  // soonest first, capped.
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  const chosen = [...seen.values()]
    .filter((m) => new Date(m.release_date) >= cutoff)
    .sort((a, b) => a.release_date.localeCompare(b.release_date))
    .slice(0, MAX_FILMS);

  const items = [];
  for (const m of chosen) {
    items.push({
      tmdbId: m.id,
      title: m.title,
      releaseDate: m.release_date,
      certification: await certificationFor(m.id),
      genres: (m.genre_ids ?? []).map((id) => genreMap.get(id)).filter(Boolean),
      overview: m.overview || '',
      poster: m.poster_path ? `${IMG_BASE}${m.poster_path}` : null,
      tmdbUrl: `https://www.themoviedb.org/movie/${m.id}`,
    });
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    source: 'The Movie Database (TMDB)',
    region: REGION,
    items,
  };
  await writeFile(OUT, JSON.stringify(payload, null, 2) + '\n');
  console.log(`films: wrote ${items.length} UK releases.`);
}

main().catch((e) => {
  console.error('films: unexpected error:', e);
  process.exitCode = 1;
});
