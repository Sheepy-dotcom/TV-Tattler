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
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PEOPLE_DIR = path.join(ROOT, 'src/content/people');
const SHOWS_DIR = path.join(ROOT, 'src/content/shows');
const OUT = path.join(ROOT, 'src/data/wikidata.json');

const UA =
  'TVTattler/0.1 (build-time enrichment; https://tvtattler.co.uk; editor@tvtattler.co.uk)';
const API = 'https://www.wikidata.org/w/api.php';

// Acceptable "instance of" (P31) values when resolving by name.
const PERSON_TYPES = new Set(['Q5']); // human
const SHOW_TYPES = new Set(['Q5398426', 'Q23739', 'Q15416']); // TV series, soap opera, TV programme

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

async function resolveQid(name, acceptTypes) {
  const url = `${API}?action=wbsearchentities&search=${encodeURIComponent(
    name,
  )}&language=en&type=item&limit=6&format=json`;
  const { search = [] } = await getJson(url);
  for (const cand of search) {
    await sleep(150);
    try {
      const ent = await entity(cand.id);
      const types = claimIds(ent, 'P31');
      if (types.some((t) => acceptTypes.has(t))) return { qid: cand.id, ent };
    } catch {
      /* skip candidate */
    }
  }
  return undefined;
}

async function enrichPerson(fm) {
  let qid = fm.wikidata;
  let ent;
  if (qid) ent = await entity(qid);
  else {
    const r = await resolveQid(fm.name, PERSON_TYPES);
    if (r) ({ qid, ent } = r);
  }
  if (!ent) return undefined;
  return {
    source: 'wikidata',
    qid,
    wikipedia: enwiki(ent),
    dateOfBirth: isoDate(firstTime(ent, 'P569')),
  };
}

async function enrichShow(fm) {
  let qid = fm.wikidata;
  let ent;
  if (qid) ent = await entity(qid);
  else {
    const r = await resolveQid(fm.title, SHOW_TYPES);
    if (r) ({ qid, ent } = r);
  }
  if (!ent) return undefined;
  return {
    source: 'wikidata',
    qid,
    wikipedia: enwiki(ent),
    inception: year(firstTime(ent, 'P571')),
    episodes: firstAmount(ent, 'P1113'),
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
      const facts = await enrichPerson(fm);
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
      const facts = await enrichShow(fm);
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
