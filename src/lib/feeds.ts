// Typed access to the generated, auto-refreshed feed data. These JSON files are
// written by the scripts in /scripts (fetch-films / fetch-episodes) and
// refreshed daily by .github/workflows/refresh-feeds.yml. Pages read them
// through here so a missing/empty feed degrades to a clean empty state.

import filmsData from '../data/feeds/films.json';
import episodesData from '../data/feeds/episodes.json';

export interface Film {
  tmdbId: number;
  title: string;
  releaseDate: string;
  certification?: string;
  genres: string[];
  overview: string;
  poster: string | null;
  tmdbUrl: string;
}

export interface Episode {
  season: number | null;
  number: number | null;
  name: string;
  airdate: string;
  airtime: string | null;
  summary: string;
  url: string | null;
}

export interface EpisodeShow {
  slug: string;
  name: string;
  tvmazeUrl: string | null;
  episodes: Episode[];
}

interface FilmsFeed {
  generatedAt: string | null;
  source: string;
  region: string;
  items: Film[];
}
interface EpisodesFeed {
  generatedAt: string | null;
  source: string;
  windowDays?: number;
  shows: EpisodeShow[];
}
export const films = filmsData as FilmsFeed;
export const episodes = episodesData as EpisodesFeed;

/** All upcoming episodes flattened and sorted by air date (for a combined view). */
export function upcomingEpisodes(): (Episode & { showSlug: string; showName: string })[] {
  return episodes.shows
    .flatMap((s) => s.episodes.map((e) => ({ ...e, showSlug: s.slug, showName: s.name })))
    .sort((a, b) => (a.airdate + (a.airtime ?? '')).localeCompare(b.airdate + (b.airtime ?? '')));
}

/** A human "when did this feed last update" label, or null if never run. */
export function freshness(generatedAt: string | null): string | null {
  if (!generatedAt) return null;
  const d = new Date(generatedAt);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
