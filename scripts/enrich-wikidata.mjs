#!/usr/bin/env node
/**
 * Build-time enrichment from Wikidata (CC0).
 *
 * Reads the people/ and shows/ content, resolves each to a Wikidata entity
 * (using a pinned `wikidata:` QID if present, otherwise searching by name and
 * verifying the entity type), fetches a few stable facts, and writes them to
 * src/data/wikidata.json for the pages to read.
 *
 * Only facts are taken — dates, an episode count, the Wikipedia sitelink — never
 * prose or images. Wikidata is public domain (CC0); we credit it anyway.
 *
 * Run with:  npm run enrich
 * Needs outbound access to www.wikidata.org (available in CI / on Cloudflare;
 * a locked-down sandbox may block it, in which case the existing cache is kept).
 */
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PEOPLE_DIR = path.join(ROOT, 'src/content/people');
const SHOWS_DIR = path.join(ROOT, 'src/content/shows');
const OUT = path.join(ROOT, 'src/data/wikidata.json');
// Downloaded Commons images live here and are committed alongside the cache, so
// the photo "comes with" the data (self-hosted, not a fragile external hotlink).
const IMG_DIR = path.join(ROOT, 'public/images/wikidata');
const IMG_WEB = '/images/wikidata';

const UA =
  'TVTattler/0.1 (build-time enrichment; https://tvtattler.co.uk; editor@tvtattler.co.uk)';
const API = 'https://www.wikidata.org/w/api.php';
const COMMONS = 'https://commons.wikimedia.org/w/api.php';

// Acceptable "instance of" (P31) values when resolving by name.
const PERSON_TYPES = new Set(['Q5']); // human
const SHOW_TYPES = new Set(['Q5398426', 'Q23739', 'Q15416']); // TV series, soap opera, TV programme

// Occupations that mark an acting career, and UK-ish citizenships — used to
// disambiguate common names (e.g. the British actress "Michelle Collins" from
// the American TV host of the same name).
const ACTOR_OCCUPATIONS = new Set([
  'Q33999', // actor
  'Q10800557', // film actor
  'Q10798782', // television actor
  'Q2405480', // voice actor
  'Q2259451', // stage actor
]);
const UK_CITIZENSHIP = new Set([
  'Q145', // United Kingdom
  'Q21', // England
  'Q22', // Scotland
  'Q25', // Wales
  'Q26', // Northern Ireland
]);

const tokens = (s) =>
  (typeof s === 'string' ? s.toLowerCase().match(/[a-z]{4,}/g) : null) ?? [];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

/** Minimal frontmatter read — just the fields we need. */
async function readFrontmatter(file) {
  const raw = await readFile(file, 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---/);
  const fm = {};
  if (m) {
    for (const line of m[1].split('\n')) {
      const kv = line.match(/^([A-Za-z]+):\s*(.+)$/);
      if (kv) fm[kv[1]] = kv[2].trim().replace(/^['"]|['"]$/g, '');
    }
  }
  return fm;
}

async function listMd(dir) {
  const files = await readdir(dir);
  return files.filter((f) => f.endsWith('.md'));
}

async function entity(qid) {
  const data = await getJson(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`);
  return data.entities?.[qid];
}

function claimIds(ent, prop) {
  return (ent?.claims?.[prop] ?? [])
    .map((c) => c.mainsnak?.datavalue?.value?.id)
    .filter(Boolean);
}

function firstTime(ent, prop) {
  const t = ent?.claims?.[prop]?.[0]?.mainsnak?.datavalue?.value?.time;
  return typeof t === 'string' ? t : undefined;
}

function firstAmount(ent, prop) {
  const a = ent?.claims?.[prop]?.[0]?.mainsnak?.datavalue?.value?.amount;
  if (typeof a !== 'string') return undefined;
  const n = parseInt(a.replace('+', ''), 10);
  return Number.isFinite(n) ? n : undefined;
}

function isoDate(time) {
  // "+1932-04-25T00:00:00Z" → "1932-04-25" (only when month/day are real)
  const m = time?.match(/^[+-](\d{4})-(\d{2})-(\d{2})/);
  if (!m || m[2] === '00' || m[3] === '00') return undefined;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

function year(time) {
  const m = time?.match(/^[+-](\d{4})/);
  return m ? parseInt(m[1], 10) : undefined;
}

function enwiki(ent) {
  const s = ent?.sitelinks?.enwiki;
  if (!s) return undefined;
  return s.url ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(s.title.replace(/ /g, '_'))}`;
}

const stripHtml = (s) =>
  typeof s === 'string' ? s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : undefined;

/**
 * Download a Commons thumbnail into public/images/wikidata/ so the photo is
 * committed alongside the data — self-hosted, not a fragile external hotlink.
 * Returns the site-root path (e.g. "/images/wikidata/person-william-roache.jpg")
 * or undefined if the fetch fails (in which case callers keep the external URL).
 */
async function downloadImage(url, name) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const type = res.headers.get('content-type') ?? '';
    const ext = type.includes('png')
      ? 'png'
      : type.includes('gif')
        ? 'gif'
        : type.includes('webp')
          ? 'webp'
          : 'jpg';
    const buf = Buffer.from(await res.arrayBuffer());
    await mkdir(IMG_DIR, { recursive: true });
    const fileName = `${name}.${ext}`;
    await writeFile(path.join(IMG_DIR, fileName), buf);
    return `${IMG_WEB}/${fileName}`;
  } catch (e) {
    console.warn(`  image ✗ ${name}: ${e.message} (keeping external URL)`);
    return undefined;
  }
}

/**
 * The image an entity points at on Wikimedia Commons (Wikidata P18), together
 * with its author and licence, so we can suggest it WITH the credit already
 * filled in. Returns undefined if there is no image. This is a suggestion only —
 * nothing uses it without an explicit opt-in.
 */
async function commonsImageSuggestion(ent) {
  const file = ent?.claims?.P18?.[0]?.mainsnak?.datavalue?.value; // e.g. "William Roache.jpg"
  if (typeof file !== 'string') return undefined;
  const title = `File:${file}`;
  const url =
    `${COMMONS}?action=query&format=json&prop=imageinfo&titles=${encodeURIComponent(title)}` +
    `&iiprop=url|extmetadata&iiurlwidth=1024`;
  const data = await getJson(url);
  const pages = data?.query?.pages ?? {};
  const page = Object.values(pages)[0];
  const info = page?.imageinfo?.[0];
  if (!info) return undefined;
  const meta = info.extmetadata ?? {};
  const author = stripHtml(meta.Artist?.value);
  const licence = stripHtml(meta.LicenseShortName?.value);
  const licenceUrl = meta.LicenseUrl?.value;
  // A ready-to-use credit line. Attribution is mandatory for CC-BY/BY-SA.
  const credit = [author, licence, 'Wikimedia Commons'].filter(Boolean).join(' · ');
  return {
    file: title,
    thumbUrl: info.thumburl ?? info.url,
    descriptionUrl: info.descriptionurl,
    credit,
    licence,
    licenceUrl,
  };
}

// Score a candidate: reject wrong-type entities (-1), otherwise reward an exact
// name match, an acting occupation, UK citizenship, a description that echoes
// the hint, and the presence of an English Wikipedia article.
function scoreCandidate(ent, name, acceptTypes, opts) {
  const types = claimIds(ent, 'P31');
  if (!types.some((t) => acceptTypes.has(t))) return -1;
  let s = 0;
  const label = (ent.labels?.en?.value ?? '').toLowerCase();
  if (label === name.toLowerCase()) s += 3;
  if (opts.occupations) {
    if (claimIds(ent, 'P106').some((o) => opts.occupations.has(o))) s += 3;
    if (claimIds(ent, 'P27').some((c) => UK_CITIZENSHIP.has(c))) s += 2;
  }
  const desc = (ent.descriptions?.en?.value ?? '').toLowerCase();
  if (opts.hint?.length && opts.hint.some((t) => desc.includes(t))) s += 2;
  if (ent.sitelinks?.enwiki) s += 1;
  return s;
}

/** Resolve a name to the best-matching entity by type + disambiguating signals. */
async function resolveQid(name, acceptTypes, opts = {}) {
  const url = `${API}?action=wbsearchentities&search=${encodeURIComponent(
    name,
  )}&language=en&type=item&limit=7&format=json`;
  const { search = [] } = await getJson(url);
  let best;
  let bestScore = -1;
  for (const cand of search) {
    await sleep(150);
    try {
      const ent = await entity(cand.id);
      const s = scoreCandidate(ent, name, acceptTypes, opts);
      if (s > bestScore) {
        bestScore = s;
        best = { qid: cand.id, ent };
      }
    } catch {
      /* skip candidate */
    }
  }
  return bestScore >= 0 ? best : undefined;
}

async function enrichPerson(slug, fm) {
  let qid = fm.wikidata;
  let ent;
  if (qid) ent = await entity(qid);
  else {
    // Disambiguate on acting occupation, UK citizenship and the knownFor hint.
    const r = await resolveQid(fm.name, PERSON_TYPES, {
      occupations: ACTOR_OCCUPATIONS,
      hint: tokens(fm.knownFor),
    });
    if (r) ({ qid, ent } = r);
  }
  if (!ent) return undefined;
  const imageSuggestion = await commonsImageSuggestion(ent);
  if (imageSuggestion?.thumbUrl) {
    imageSuggestion.imageLocal = await downloadImage(imageSuggestion.thumbUrl, `person-${slug}`);
  }
  return {
    source: 'wikidata',
    qid,
    wikipedia: enwiki(ent),
    dateOfBirth: isoDate(firstTime(ent, 'P569')),
    imageSuggestion,
  };
}

async function enrichShow(slug, fm) {
  let qid = fm.wikidata;
  let ent;
  if (qid) ent = await entity(qid);
  else {
    const r = await resolveQid(fm.title, SHOW_TYPES);
    if (r) ({ qid, ent } = r);
  }
  if (!ent) return undefined;
  const imageSuggestion = await commonsImageSuggestion(ent);
  if (imageSuggestion?.thumbUrl) {
    imageSuggestion.imageLocal = await downloadImage(imageSuggestion.thumbUrl, `show-${slug}`);
  }
  return {
    source: 'wikidata',
    qid,
    wikipedia: enwiki(ent),
    inception: year(firstTime(ent, 'P571')),
    episodes: firstAmount(ent, 'P1113'),
    imageSuggestion,
  };
}

async function main() {
  // Start from the existing cache so any lookup we can't refresh is preserved.
  let cache = { generatedAt: null, people: {}, shows: {} };
  try {
    cache = JSON.parse(await readFile(OUT, 'utf8'));
  } catch {
    /* first run */
  }
  cache.people ??= {};
  cache.shows ??= {};

  let ok = 0;
  let failed = 0;

  for (const file of await listMd(PEOPLE_DIR)) {
    const slug = file.replace(/\.md$/, '');
    const fm = await readFrontmatter(path.join(PEOPLE_DIR, file));
    try {
      const facts = await enrichPerson(slug, fm);
      if (facts) {
        cache.people[slug] = facts;
        ok++;
        console.log(`person ✓ ${slug} → ${facts.qid ?? '(unresolved)'}`);
      } else {
        failed++;
        console.warn(`person – ${slug}: no match, keeping existing`);
      }
    } catch (e) {
      failed++;
      console.warn(`person ✗ ${slug}: ${e.message} (keeping existing)`);
    }
    await sleep(200);
  }

  for (const file of await listMd(SHOWS_DIR)) {
    const slug = file.replace(/\.md$/, '');
    const fm = await readFrontmatter(path.join(SHOWS_DIR, file));
    try {
      const facts = await enrichShow(slug, fm);
      if (facts) {
        cache.shows[slug] = facts;
        ok++;
        console.log(`show   ✓ ${slug} → ${facts.qid ?? '(unresolved)'}`);
      } else {
        failed++;
        console.warn(`show   – ${slug}: no match, keeping existing`);
      }
    } catch (e) {
      failed++;
      console.warn(`show   ✗ ${slug}: ${e.message} (keeping existing)`);
    }
    await sleep(200);
  }

  if (ok === 0) {
    console.error('No entities enriched (network blocked?). Cache left unchanged.');
    process.exitCode = 1;
    return;
  }

  cache.generatedAt = new Date().toISOString();
  delete cache.note; // drop the seed explainer once real data lands
  await writeFile(OUT, JSON.stringify(cache, null, 2) + '\n');
  console.log(`\nWrote ${OUT} — ${ok} enriched, ${failed} skipped.`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
