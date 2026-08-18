import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { getArticles } from '../lib/relations';

// A small prebuilt search index emitted as a static JSON file. The /search/
// page fetches this and filters it client-side — the one place the site uses
// JavaScript, because search genuinely needs it.

interface Entry {
  type: 'Article' | 'Show' | 'Character' | 'Person';
  title: string;
  url: string;
  meta: string;
  text: string; // extra searchable text (tags, summaries)
}

export const GET: APIRoute = async () => {
  const [articles, shows, characters, people] = await Promise.all([
    getArticles(),
    getCollection('shows'),
    getCollection('characters'),
    getCollection('people'),
  ]);

  const showTitle = new Map(shows.map((s) => [s.id, s.data.title]));

  const entries: Entry[] = [];

  for (const a of articles) {
    entries.push({
      type: 'Article',
      title: a.data.title,
      url: `/articles/${a.id}/`,
      meta: a.data.section,
      text: [a.data.standfirst, a.data.kind, ...a.data.tags].join(' '),
    });
  }

  for (const s of shows) {
    entries.push({
      type: 'Show',
      title: s.data.title,
      url: `/shows/${s.id}/`,
      meta: s.data.broadcaster,
      text: s.data.summary,
    });
  }

  for (const c of characters) {
    entries.push({
      type: 'Character',
      title: c.data.name,
      url: `/characters/${c.id}/`,
      meta: showTitle.get(c.data.show.id) ?? '',
      text: c.data.summary,
    });
  }

  for (const p of people) {
    entries.push({
      type: 'Person',
      title: p.data.name,
      url: `/people/${p.id}/`,
      meta: p.data.knownFor,
      text: p.data.summary,
    });
  }

  return new Response(JSON.stringify(entries), {
    headers: { 'Content-Type': 'application/json' },
  });
};
