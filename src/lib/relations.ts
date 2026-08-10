import { getCollection, type CollectionEntry } from 'astro:content';

// ---------------------------------------------------------------------------
// relations.ts — every derived query lives here so pages stay thin.
//
// Articles never link to each other. They point at entities (shows, characters,
// people). All the cross-linking on the site is *derived* from those references
// by the functions below.
// ---------------------------------------------------------------------------

export type Show = CollectionEntry<'shows'>;
export type Person = CollectionEntry<'people'>;
export type Character = CollectionEntry<'characters'>;
export type Article = CollectionEntry<'articles'>;

// A published article: not a draft (drafts are hidden in production builds only,
// so they still render during `astro dev`).
function isVisible(article: Article): boolean {
  return import.meta.env.PROD ? !article.data.draft : true;
}

/** All visible articles, newest first. */
export async function getArticles(): Promise<Article[]> {
  const articles = await getCollection('articles', isVisible);
  return articles.sort(
    (a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime(),
  );
}

/** Does an article reference a given entity id in one of its relation arrays? */
function references(article: Article, key: 'shows' | 'characters' | 'people', id: string): boolean {
  return article.data[key].some((ref) => ref.id === id);
}

/** Every visible article that references this show, newest first. */
export async function articlesForShow(showId: string): Promise<Article[]> {
  const articles = await getArticles();
  return articles.filter((a) => references(a, 'shows', showId));
}

/** Every visible article that references this character, newest first. */
export async function articlesForCharacter(characterId: string): Promise<Article[]> {
  const articles = await getArticles();
  return articles.filter((a) => references(a, 'characters', characterId));
}

/** Every visible article that references this person, newest first. */
export async function articlesForPerson(personId: string): Promise<Article[]> {
  const articles = await getArticles();
  return articles.filter((a) => references(a, 'people', personId));
}

/** All characters belonging to a show. */
export async function charactersForShow(showId: string): Promise<Character[]> {
  const characters = await getCollection('characters');
  return characters
    .filter((c) => c.data.show.id === showId)
    .sort((a, b) => a.data.name.localeCompare(b.data.name));
}

/**
 * The cast-changes subsection for a show: its articles filtered to
 * `kind: cast-change`. A show page shows these separately from general coverage.
 */
export async function castChangesForShow(showId: string): Promise<Article[]> {
  const articles = await articlesForShow(showId);
  return articles.filter((a) => a.data.kind === 'cast-change');
}

/**
 * A role held by a person, derived by reading *backwards* through every
 * character's portrayals. An actor's filmography is never maintained by hand.
 */
export interface Role {
  character: Character;
  show: Show;
  from: number;
  to?: number;
  note?: string;
  ongoing: boolean;
}

/**
 * Every role a person has played, derived from the portrayals of all
 * characters. Ordered by start year, most recent first.
 */
export async function rolesForPerson(personId: string): Promise<Role[]> {
  const [characters, shows] = await Promise.all([
    getCollection('characters'),
    getCollection('shows'),
  ]);
  const showById = new Map(shows.map((s) => [s.id, s]));

  const roles: Role[] = [];
  for (const character of characters) {
    for (const p of character.data.portrayals) {
      if (p.person.id !== personId) continue;
      const show = showById.get(character.data.show.id);
      if (!show) continue; // reference() guarantees this, but keep the type honest
      roles.push({
        character,
        show,
        from: p.from,
        to: p.to,
        note: p.note,
        ongoing: p.to === undefined,
      });
    }
  }

  return roles.sort((a, b) => b.from - a.from);
}

// ---------------------------------------------------------------------------
// "Read next" — ranked by shared entities.
//
// A shared character or show weighs more than a shared tag, so a Cindy Beale
// piece surfaces other Cindy Beale pieces before generic EastEnders ones.
// ---------------------------------------------------------------------------

const WEIGHT = {
  character: 4,
  person: 3,
  show: 2,
  tag: 1,
} as const;

function sharedCount(a: string[], b: Set<string>): number {
  let n = 0;
  for (const id of a) if (b.has(id)) n++;
  return n;
}

export interface RankedArticle {
  article: Article;
  score: number;
}

/**
 * Articles to read after `current`, ranked by how many entities they share
 * with it (characters and shows weighted above tags). Never returns `current`.
 */
export async function readNext(current: Article, limit = 4): Promise<RankedArticle[]> {
  const all = await getArticles();

  const chars = new Set(current.data.characters.map((r) => r.id));
  const people = new Set(current.data.people.map((r) => r.id));
  const shows = new Set(current.data.shows.map((r) => r.id));
  const tags = new Set(current.data.tags);

  const ranked: RankedArticle[] = [];
  for (const article of all) {
    if (article.id === current.id) continue;
    const score =
      sharedCount(article.data.characters.map((r) => r.id), chars) * WEIGHT.character +
      sharedCount(article.data.people.map((r) => r.id), people) * WEIGHT.person +
      sharedCount(article.data.shows.map((r) => r.id), shows) * WEIGHT.show +
      sharedCount(article.data.tags, tags) * WEIGHT.tag;
    if (score > 0) ranked.push({ article, score });
  }

  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Tie-break on recency so the ordering is deterministic.
    return b.article.data.publishedAt.getTime() - a.article.data.publishedAt.getTime();
  });

  return ranked.slice(0, limit);
}

/** Visible articles in a section, newest first. */
export async function articlesInSection(
  section: Article['data']['section'],
): Promise<Article[]> {
  const articles = await getArticles();
  return articles.filter((a) => a.data.section === section);
}

/** Visible articles of a given kind, newest first. */
export async function articlesOfKind(kind: Article['data']['kind']): Promise<Article[]> {
  const articles = await getArticles();
  return articles.filter((a) => a.data.kind === kind);
}

// ---------------------------------------------------------------------------
// Accent resolution — colour is data. Every listing row is coloured by the
// accent of the show it belongs to.
// ---------------------------------------------------------------------------

/** Map of show id → accent hex, for cheap lookups when rendering many rows. */
export async function getShowAccentMap(): Promise<Map<string, string>> {
  const shows = await getCollection('shows');
  return new Map(shows.map((s) => [s.id, s.data.accent]));
}

/**
 * The accent an article should wear: the accent of its first referenced show.
 * Articles with no show (e.g. a celebrity profile) get no accent, and the row
 * falls back to the neutral ink bar via the CSS default.
 */
export function accentForArticle(
  article: Article,
  accentMap: Map<string, string>,
): string | undefined {
  const first = article.data.shows[0];
  return first ? accentMap.get(first.id) : undefined;
}
