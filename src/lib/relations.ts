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

/** All shows, alphabetical by title. */
export async function getShows(): Promise<Show[]> {
  const shows = await getCollection('shows');
  return shows.sort((a, b) => a.data.title.localeCompare(b.data.title));
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

/**
 * A person's roles grouped by character: one entry per character, with all of
 * that character's stints folded in. (rolesForPerson returns one row per stint;
 * this is the view a person page wants — Cindy Beale once, not once per stint.)
 */
export interface GroupedRole {
  character: Character;
  show: Show;
  stints: { from: number; to?: number; ongoing: boolean; note?: string }[];
  firstYear: number;
  ongoing: boolean;
}

export async function groupedRolesForPerson(personId: string): Promise<GroupedRole[]> {
  const roles = await rolesForPerson(personId);

  const byCharacter = new Map<string, GroupedRole>();
  for (const role of roles) {
    const existing = byCharacter.get(role.character.id);
    const stint = { from: role.from, to: role.to, ongoing: role.ongoing, note: role.note };
    if (existing) {
      existing.stints.push(stint);
      existing.firstYear = Math.min(existing.firstYear, role.from);
      existing.ongoing = existing.ongoing || role.ongoing;
    } else {
      byCharacter.set(role.character.id, {
        character: role.character,
        show: role.show,
        stints: [stint],
        firstYear: role.from,
        ongoing: role.ongoing,
      });
    }
  }

  const grouped = [...byCharacter.values()];
  for (const g of grouped) g.stints.sort((a, b) => a.from - b.from);
  // Most recent role first.
  return grouped.sort((a, b) => b.firstYear - a.firstYear);
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
// Portrayal timeline — the signature element.
//
// One band per actor (grouped from the portrayals rows), each band holding one
// or more segments. A recast is two bands; a break-and-return is one band with
// two segments. Everything is drawn to scale against a shared year range.
// ---------------------------------------------------------------------------

export interface TimelineSegment {
  from: number;
  to?: number;
  ongoing: boolean; // no end year yet → drawn striped
  note?: string;
}

export interface TimelineBand {
  personId: string;
  personName: string;
  segments: TimelineSegment[];
  /** Earliest start across this band's segments, for ordering. */
  earliest: number;
}

export interface Timeline {
  bands: TimelineBand[];
  minYear: number;
  maxYear: number;
  /** A few evenly-spaced years for the axis. */
  ticks: number[];
}

/** Build the portrayal timeline for a character. */
export async function timelineForCharacter(character: Character): Promise<Timeline> {
  const currentYear = new Date().getFullYear();
  const people = await getCollection('people');
  const nameById = new Map(people.map((p) => [p.id, p.data.name]));

  // Group portrayal rows by the actor.
  const byPerson = new Map<string, TimelineSegment[]>();
  for (const p of character.data.portrayals) {
    const seg: TimelineSegment = {
      from: p.from,
      to: p.to,
      ongoing: p.to === undefined,
      note: p.note,
    };
    const list = byPerson.get(p.person.id);
    if (list) list.push(seg);
    else byPerson.set(p.person.id, [seg]);
  }

  const bands: TimelineBand[] = [];
  for (const [personId, segments] of byPerson) {
    segments.sort((a, b) => a.from - b.from);
    bands.push({
      personId,
      personName: nameById.get(personId) ?? personId,
      segments,
      earliest: Math.min(...segments.map((s) => s.from)),
    });
  }
  // Oldest stint first — the timeline reads top-to-bottom as history.
  bands.sort((a, b) => a.earliest - b.earliest);

  const allFrom = character.data.portrayals.map((p) => p.from);
  const allTo = character.data.portrayals.map((p) => p.to ?? currentYear);
  const minYear = allFrom.length ? Math.min(...allFrom) : currentYear;
  const maxYear = allTo.length ? Math.max(...allTo, currentYear) : currentYear;

  // 4–6 tick marks, rounded to whole years.
  const span = Math.max(1, maxYear - minYear);
  const tickCount = Math.min(5, span);
  const ticks: number[] = [];
  for (let i = 0; i <= tickCount; i++) {
    ticks.push(Math.round(minYear + (span * i) / tickCount));
  }

  return { bands, minYear, maxYear, ticks: [...new Set(ticks)] };
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

/** What a card needs to draw its accent poster: the show's colour and title. */
export interface Poster {
  accent?: string;
  showTitle?: string;
}

/** Map of show id → { accent, title }, for building card posters. */
export async function getShowLookup(): Promise<Map<string, { accent: string; title: string }>> {
  const shows = await getCollection('shows');
  return new Map(shows.map((s) => [s.id, { accent: s.data.accent, title: s.data.title }]));
}

/**
 * The poster an article's card should wear — its first referenced show's colour
 * and title. Articles with no show get an empty poster (drawn in neutral ink).
 */
export function posterForArticle(
  article: Article,
  lookup: Map<string, { accent: string; title: string }>,
): Poster {
  const first = article.data.shows[0];
  const show = first ? lookup.get(first.id) : undefined;
  return { accent: show?.accent, showTitle: show?.title };
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
