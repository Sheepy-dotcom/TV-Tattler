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
import sharp from 'sharp';

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
    const input = Buffer.from(await res.arrayBuffer());
    // Normalise to a lean, capped JPEG. A 1024px Commons PNG can be several MB;
    // as a width-capped JPEG it's a fraction, and every committed image is a
    // consistent, web-friendly size regardless of the source format.
    const out = await sharp(input)
      .rotate() // respect EXIF orientation
      .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
    await mkdir(IMG_DIR, { recursive: true });
    const fileName = `${name}.jpg`;
    await writeFile(path.join(IMG_DIR, fileName), out);
    return `${IMG_WEB}/${fileName}`;
  } catch (e) {
    console.warn(`  image ✗ ${name}: ${e.message} (keeping external URL)`);
    return undefined;
  }
}

/**
 * Build a ready-to-use suggestion from a single Commons file title (e.g.
 * "File:William Roache.jpg"): its 1024px thumbnail plus the author/licence
 * credit. Returns undefined if the file is not on Commons — which is exactly
 * the filter we want, since a non-free file lives locally on Wikipedia and
 * never resolves here.
 */
async function commonsSuggestionForFile(title, { minWidth = 0, jpegOnly = false } = {}) {
  const url =
    `${COMMONS}?action=query&format=json&prop=imageinfo&titles=${encodeURIComponent(title)}` +
    `&iiprop=url|extmetadata|size|mime&iiurlwidth=1024`;
  const data = await getJson(url);
  const pages = data?.query?.pages ?? {};
  const page = Object.values(pages)[0];
  const info = page?.imageinfo?.[0];
  if (!info) return undefined;
  // Only raster photos, above a minimum width (skips icons, crests, tiny files).
  // jpegOnly narrows to actual photographs — infographics, charts, logos and
  // screenshots are almost always PNG, so it filters them out wholesale.
  const okMime = jpegOnly ? /^image\/jpe?g$/ : /^image\/(jpe?g|png|webp)$/;
  if (info.mime && !okMime.test(info.mime)) return undefined;
  if (minWidth && typeof info.width === 'number' && info.width < minWidth) return undefined;
  const meta = info.extmetadata ?? {};
  const author = stripHtml(meta.Artist?.value);
  const licence = stripHtml(meta.LicenseShortName?.value);
  // Skip anything not clearly free to reuse (fair-use / all-rights-reserved).
  if (licence && /fair use|non-?free|all rights reserved/i.test(licence)) return undefined;
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
    width: info.width,
    height: info.height,
  };
}

// A portrait score: reward a head-and-shoulders shape (a bit taller than wide),
// penalise extreme full-length shots and anything landscape/group, and prefer a
// decent resolution. Used to pick the nicest face photo when several exist.
function portraitScore(s) {
  if (!s || !s.width || !s.height) return 0;
  const ratio = s.height / s.width; // >1 = portrait
  let score = 0;
  if (ratio >= 1.05 && ratio <= 1.5) score += 3; // classic headshot / bust
  else if (ratio > 0.85 && ratio < 1.05) score += 1; // near-square, usually fine
  else if (ratio > 1.5 && ratio <= 1.9) score += 0; // fairly tall (often full body)
  else score -= 3; // very tall full-length, or landscape/group
  if (s.width >= 500) score += 1;
  if (s.width < 320) score -= 2;
  return score;
}

// Drop the sizing fields we only used for scoring before the suggestion is cached.
function trimSuggestion(s) {
  if (s) {
    delete s.width;
    delete s.height;
  }
  return s;
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
  return commonsSuggestionForFile(`File:${file}`);
}

/**
 * Fallback when Wikidata has no P18: the lead image of the entity's English
 * Wikipedia article. Living-person leads on en.wp must be freely licensed, and
 * resolving the file through Commons (above) drops anything non-free, so this is
 * a safe, well-credited source for the actors Wikidata simply hasn't tagged.
 */
async function wikipediaLeadTitle(ent) {
  const title = ent?.sitelinks?.enwiki?.title;
  if (!title) return undefined;
  const url =
    'https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages' +
    `&piprop=name&titles=${encodeURIComponent(title)}`;
  const data = await getJson(url);
  const page = Object.values(data?.query?.pages ?? {})[0];
  const name = page?.pageimage; // bare filename, no "File:" prefix
  return typeof name === 'string' ? `File:${name}` : undefined;
}

async function wikipediaLeadImageSuggestion(ent) {
  const t = await wikipediaLeadTitle(ent);
  return t ? commonsSuggestionForFile(t) : undefined;
}

/**
 * The nicest available portrait of a person, chosen only from images that are
 * unambiguously theirs: Wikidata's own P18 and the lead image of their English
 * Wikipedia article. Both are curated per-entity, so there's no risk of pulling a
 * same-named stranger. We score the two by how head-and-shoulders they look and
 * take the better one — enough to prefer a portrait over a full-length shot.
 *
 * (A person's Commons category is deliberately NOT used: categories like
 * "Alison King" mix in different people who share the name, and a wrong-person
 * photo is far worse than a slightly stiff-but-correct one.)
 */
async function bestPersonImageSuggestion(ent) {
  const prio = new Map(); // File:title -> source nudge (curated sources win ties)
  const p18 = ent?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
  if (typeof p18 === 'string') prio.set(`File:${p18}`, 3);
  const lead = await wikipediaLeadTitle(ent);
  if (lead) prio.set(lead, Math.max(prio.get(lead) ?? 0, 2));

  let best;
  let bestScore = -Infinity;
  for (const [title, nudge] of prio) {
    await sleep(120);
    const s = await commonsSuggestionForFile(title, { minWidth: 300 });
    if (!s) continue;
    const score = portraitScore(s) + nudge * 0.5;
    if (score > bestScore) {
      bestScore = score;
      best = s;
    }
  }
  return trimSuggestion(best);
}

/**
 * Last-ditch image for a SHOW that Wikidata hasn't tagged (P18) and whose
 * Wikipedia lead is a non-free title card: the first decent free photo in the
 * show's Commons category (P373) — typically a set or filming-location shot.
 * Logos, crests, maps and tiny files are filtered out; only a landscape-ish
 * free raster of reasonable size is accepted.
 */
async function commonsCategoryImageSuggestion(ent, showName) {
  const cat = ent?.claims?.P373?.[0]?.mainsnak?.datavalue?.value; // e.g. "EastEnders"
  if (typeof cat !== 'string') return undefined;
  const url =
    `${COMMONS}?action=query&format=json&list=categorymembers&cmtype=file` +
    `&cmtitle=${encodeURIComponent(`Category:${cat}`)}&cmlimit=100`;
  const data = await getJson(url);
  const members = data?.query?.categorymembers ?? [];
  const skip =
    /logo|icon|crest|map|diagram|signature|title.?card|poster|dvd|cover|font|poll|result|chart|graph|screenshot|scan|award|infographic/i;
  // Only accept a file that actually names the show — the collapsed title
  // (e.g. "eastenders") or a distinctive word from it — so a category's stray
  // off-topic image (a generic city mosaic, say) is never chosen. If nothing
  // matches, the caller keeps the show's own on-brand illustration.
  const collapsed = (showName ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const words = tokens(showName).filter((w) => w.length >= 5);
  const relevant = (title) => {
    const t = title.toLowerCase().replace(/[^a-z0-9]/g, '');
    return (collapsed && t.includes(collapsed)) || words.some((w) => t.includes(w));
  };
  for (const m of members) {
    if (typeof m.title !== 'string' || skip.test(m.title) || !relevant(m.title)) continue;
    await sleep(120);
    const s = await commonsSuggestionForFile(m.title, { minWidth: 600, jpegOnly: true });
    if (s) return s;
  }
  return undefined;
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
  // Pick the nicest portrait across P18, the Wikipedia lead, and the person's
  // Commons category — a proper head-and-shoulders shot beats a full-length one.
  const imageSuggestion = await bestPersonImageSuggestion(ent);
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
  // P18 → free Wikipedia lead → first decent photo in the show's Commons category.
  const imageSuggestion =
    (await commonsImageSuggestion(ent)) ??
    (await wikipediaLeadImageSuggestion(ent)) ??
    (await commonsCategoryImageSuggestion(ent, fm.title));
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
