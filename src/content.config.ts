import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';

// ---------------------------------------------------------------------------
// TV Tattler content model
//
// Four collections. Every relation uses reference() so it is type-checked at
// build time — a typo in a character's `show` or a portrayal's `person` fails
// the build instead of silently producing a dead page.
//
// The information architecture rule: an article lives in exactly ONE section.
// Things that sound like categories but aren't a home for content (spoilers,
// cast-changes, reviews...) are a `kind`, not a section — so "soap spoilers"
// gets its own listing without becoming a rival section in search.
// ---------------------------------------------------------------------------

// A section is a genuine home for content. Exactly four, and an article picks one.
const SECTIONS = ['soaps', 'tv-and-film', 'celebrities', 'news'] as const;

// A kind is a cross-cutting type of piece. It drives listing pages
// (e.g. every cast-change across the site) without splitting the sections.
const KINDS = ['news', 'feature', 'spoiler', 'cast-change', 'review', 'guide'] as const;

// Hex accent validator — each show carries its own identity colour.
const hexColour = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'accent must be a 6-digit hex colour, e.g. #E8134B');

// A sensible year range so a fat-fingered `1066` or `20255` is caught early.
const year = z.number().int().min(1922).max(2100);

// A Wikidata QID (e.g. Q1362) used to pin an entity to its Wikidata record, so
// the build-time enrichment fetches facts for the right subject. Optional —
// the enrichment can also resolve by name.
const qid = z
  .string()
  .regex(/^Q\d+$/, 'wikidata must be a QID like Q1362')
  .optional();

// Image fields shared by people and shows. A self-hosted `image` always wins;
// `useWikidataImage: true` opts in to the Commons image the enrichment
// suggested (with its licence credit) — nothing is used without this opt-in.
const entityImageFields = {
  image: z.string().optional(),
  imageAlt: z.string().optional(),
  imageCredit: z.string().optional(),
  useWikidataImage: z.boolean().default(false),
};

const shows = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/shows' }),
  schema: z.object({
    title: z.string(),
    broadcaster: z.string(),
    section: z.enum(SECTIONS),
    accent: hexColour,
    startYear: year,
    endYear: year.optional(),
    airs: z.string().optional(), // e.g. "Mon, Wed, Fri" — human-readable schedule
    summary: z.string(),
    wikidata: qid,
    ...entityImageFields,
  }),
});

const people = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/people' }),
  schema: z.object({
    name: z.string(),
    born: z.coerce.date().optional(),
    knownFor: z.string(), // one-line hook, e.g. "Cindy Beale in EastEnders"
    summary: z.string(),
    wikidata: qid,
    ...entityImageFields,
  }),
});

const characters = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/characters' }),
  schema: z.object({
    name: z.string(),
    show: reference('shows'),
    status: z.enum(['current', 'departed', 'deceased', 'occasional']),
    summary: z.string(),
    // Refs to other characters — used to build a family box on the page.
    family: z.array(reference('characters')).default([]),
    // The single most important field on the site. One entry per stint:
    // a recast, a break, or a return is simply another row.
    portrayals: z
      .array(
        z.object({
          person: reference('people'),
          from: year,
          to: year.optional(), // absent = ongoing (drawn striped on the timeline)
          note: z.string().optional(), // e.g. "temporary recast", "returned"
        }),
      )
      .default([]),
  }),
});

const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    standfirst: z.string(), // deck / summary line; also the meta description source
    section: z.enum(SECTIONS),
    kind: z.enum(KINDS),
    // Optional hero image. When absent, cards fall back to a bold accent
    // "poster" in the show's colour — so the site looks complete before any
    // photography exists, and real images drop straight in later.
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    // Required credit line for a press/licensed image, e.g. "© BBC". Only use
    // images you are licensed for (press images are editorial-use, credited,
    // unaltered) — this renders the mandatory attribution.
    imageCredit: z.string().optional(),
    // Official sources this article draws facts from — e.g. a BBC Media Centre
    // or ITV Press Centre release. We cite and link them; we never republish
    // their text. Facts are extracted; the prose here is our own.
    sources: z
      .array(
        z.object({
          title: z.string(),
          url: z.string().url(),
          publisher: z.string().optional(), // e.g. "BBC Media Centre"
        }),
      )
      .default([]),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    author: z.string(),
    // Articles point at ENTITIES, never at each other. Cross-linking falls out
    // of these references automatically.
    shows: z.array(reference('shows')).default([]),
    characters: z.array(reference('characters')).default([]),
    people: z.array(reference('people')).default([]),
    tags: z.array(z.string()).default([]),
    spoiler: z.boolean().default(false),
    lead: z.boolean().default(false), // eligible for the large homepage lead slot
    draft: z.boolean().default(false),
  }),
});

export const collections = { shows, people, characters, articles };

// Re-export the constant tuples so pages and lib can iterate sections/kinds
// without redeclaring them.
export { SECTIONS, KINDS };
