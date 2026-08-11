#!/usr/bin/env node
/**
 * Scaffold a new article, wired to its entities and its official source.
 *
 * This is the safe way to work from a BBC Media Centre / ITV Press Centre
 * release: it records the FACTS (who, what, when, and the source link) and
 * leaves you an empty body to write in your OWN words. It never copies release
 * text, and it makes citing the source the default, not an afterthought.
 *
 * Example — a cast-change from an ITV press release:
 *   npm run new -- \
 *     --title "New face joins the Rovers Return" \
 *     --section soaps --kind cast-change \
 *     --show coronation-street --person some-actor \
 *     --source-url "https://www.itv.com/presscentre/..." \
 *     --source-publisher "ITV Press Centre"
 */
import { readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'src/content/articles');

const SECTIONS = ['soaps', 'tv-and-film', 'celebrities', 'news'];
const KINDS = ['news', 'feature', 'spoiler', 'cast-change', 'review', 'guide'];

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) args[key] = true;
      else {
        args[key] = next;
        i++;
      }
    }
  }
  return args;
}

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);

const list = (v) =>
  typeof v === 'string' ? v.split(',').map((x) => x.trim()).filter(Boolean) : [];

const yamlList = (key, items) =>
  items.length ? `${key}:\n${items.map((i) => `  - ${i}`).join('\n')}\n` : `${key}: []\n`;

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.title || !args.section || !args.kind) {
    console.error(
      'Usage: npm run new -- --title "..." --section <section> --kind <kind>\n' +
        '  [--show a,b] [--character a,b] [--person a,b] [--tags a,b]\n' +
        '  [--source-url URL --source-publisher "BBC Media Centre"]\n' +
        '  [--spoiler] [--lead] [--image /path --image-credit "© BBC"]\n\n' +
        `  sections: ${SECTIONS.join(', ')}\n  kinds: ${KINDS.join(', ')}`,
    );
    process.exit(1);
  }
  if (!SECTIONS.includes(args.section)) throw new Error(`--section must be one of ${SECTIONS}`);
  if (!KINDS.includes(args.kind)) throw new Error(`--kind must be one of ${KINDS}`);

  const slug = slugify(args.title);
  const file = path.join(DIR, `${slug}.md`);
  if (await exists(file)) throw new Error(`Refusing to overwrite existing ${slug}.md`);

  // Timestamp for publishedAt — a normal build script, so Date is fine here.
  const today = new Date().toISOString().slice(0, 10);
  const author =
    args.author ||
    (await readFile(path.join(DIR, '..', '..', '..', 'package.json'), 'utf8')
      .then(() => 'Shaun Russett')
      .catch(() => 'Editor'));

  let sources = '';
  if (args['source-url']) {
    sources =
      'sources:\n' +
      `  - title: ${args['source-title'] || 'Official source'}\n` +
      `    url: ${args['source-url']}\n` +
      (args['source-publisher'] ? `    publisher: ${args['source-publisher']}\n` : '');
  }

  const fm =
    '---\n' +
    `title: ${JSON.stringify(args.title)}\n` +
    'standfirst: >-\n  TODO: one-sentence deck, in your own words.\n' +
    `section: ${args.section}\n` +
    `kind: ${args.kind}\n` +
    `publishedAt: ${today}\n` +
    `author: ${author}\n` +
    yamlList('shows', list(args.show)) +
    yamlList('characters', list(args.character)) +
    yamlList('people', list(args.person)) +
    yamlList('tags', list(args.tags)) +
    `spoiler: ${Boolean(args.spoiler)}\n` +
    `lead: ${Boolean(args.lead)}\n` +
    'draft: true\n' +
    (args.image ? `image: ${args.image}\n` : '') +
    (args['image-credit'] ? `imageCredit: ${JSON.stringify(args['image-credit'])}\n` : '') +
    sources +
    '---\n\n' +
    '<!-- Write in your OWN words. Take the facts from the source above; never\n' +
    '     paste release text or unlicensed images. Remove this note when done. -->\n\n' +
    'TODO: write the article.\n';

  await writeFile(file, fm);
  console.log(`Created src/content/articles/${slug}.md (draft: true).`);
  if (!args['source-url']) {
    console.log('Tip: pass --source-url to cite where the facts came from.');
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
