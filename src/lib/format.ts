// Small formatting helpers. Dates are rendered in the mono continuity-slate
// style, so they come out short and uppercase-friendly.

const DAY_MONTH_YEAR = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/** e.g. "10 Aug 2026" — for article datelines. */
export function formatDate(date: Date): string {
  return DAY_MONTH_YEAR.format(date);
}

/** Machine-readable date for <time datetime>. */
export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * A year range for shows and portrayals. An open end (still running / ongoing
 * stint) becomes an en-dash with nothing after it: "2004–".
 */
export function yearRange(from: number, to?: number): string {
  return to ? `${from}–${to}` : `${from}–`;
}

/** Human label for a section slug. */
export function sectionLabel(section: string): string {
  switch (section) {
    case 'soaps':
      return 'Soaps';
    case 'tv-and-film':
      return 'TV & Film';
    case 'celebrities':
      return 'Celebrities';
    case 'news':
      return 'News';
    default:
      return section;
  }
}

/** Fun identity for each section: a label, an emoji and a colour, for
    colourful wayfinding across the nav, section headers and category buttons. */
export interface SectionMeta {
  label: string;
  emoji: string;
  color: string;
  blurb: string;
}

const SECTION_META: Record<string, SectionMeta> = {
  soaps: {
    label: 'Soaps',
    emoji: '📺',
    color: '#d6336c',
    blurb: 'Continuing dramas — the storylines, the cast, and who plays whom.',
  },
  'tv-and-film': {
    label: 'TV & Film',
    emoji: '🎬',
    color: '#6741d9',
    blurb: 'Series, one-offs and films, with the people behind them.',
  },
  celebrities: {
    label: 'Celebrities',
    emoji: '⭐',
    color: '#e8590c',
    blurb: 'The presenters and performers, and the roles they are known for.',
  },
  news: {
    label: 'News',
    emoji: '📰',
    color: '#1c7ed6',
    blurb: 'What is changing across UK telly.',
  },
};

export function sectionMeta(section: string): SectionMeta {
  return (
    SECTION_META[section] ?? { label: section, emoji: '📺', color: '#17122a', blurb: '' }
  );
}

/** Human label for a kind slug. */
export function kindLabel(kind: string): string {
  switch (kind) {
    case 'cast-change':
      return 'Cast change';
    case 'news':
      return 'News';
    case 'feature':
      return 'Feature';
    case 'spoiler':
      return 'Spoiler';
    case 'review':
      return 'Review';
    case 'guide':
      return 'Guide';
    default:
      return kind;
  }
}

/**
 * A short monogram for a show, for small poster thumbnails.
 * "EastEnders" → "EE", "Coronation Street" → "CS".
 */
export function monogram(title: string): string {
  const caps = title.match(/[A-Z]/g);
  if (caps && caps.length >= 2) return caps.slice(0, 2).join('');
  return title.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase();
}

/** Human label for a character status. */
export function statusLabel(status: string): string {
  switch (status) {
    case 'current':
      return 'Current';
    case 'departed':
      return 'Departed';
    case 'deceased':
      return 'Deceased';
    case 'occasional':
      return 'Occasional';
    default:
      return status;
  }
}
