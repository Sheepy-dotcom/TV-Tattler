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
