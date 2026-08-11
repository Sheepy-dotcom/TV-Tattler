import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getArticles } from '../lib/relations';
import { sectionLabel } from '../lib/format';

// The article feed. Reference pages are evergreen and don't belong in a feed;
// articles are what's "fresh", so those are what we syndicate.
export async function GET(context: APIContext) {
  const articles = await getArticles();

  return rss({
    title: 'TV Tattler',
    description:
      'A soaps-first UK entertainment site: complete, accurate reference pages for every show, character and actor.',
    site: context.site ?? 'https://tvtattler.co.uk',
    items: articles.map((article) => ({
      title: article.data.title,
      description: article.data.standfirst,
      link: `/articles/${article.id}/`,
      pubDate: article.data.publishedAt,
      categories: [sectionLabel(article.data.section), article.data.kind],
      author: article.data.author,
    })),
    customData: '<language>en-gb</language>',
  });
}
