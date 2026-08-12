# Live feeds — films, episodes & headlines

Three parts of the site update themselves, with no daily effort from you:

| Page | Source | Needs a key? | Script |
| --- | --- | --- | --- |
| `/films/` — new & upcoming UK cinema releases | [TMDB](https://www.themoviedb.org/) | **Yes** (`TMDB_API_KEY`) | `scripts/fetch-films.mjs` |
| `/whats-on/` — this fortnight's soap episodes | [TVmaze](https://www.tvmaze.com/api) | No | `scripts/fetch-episodes.mjs` |
| `/headlines/` — aggregated soap news (links out) | RSS feeds you choose | No | `scripts/fetch-news.mjs` |

Each script writes a JSON file under `src/data/feeds/`. The pages read those files,
so the site stays a fast static build — no live API calls when a visitor loads a page.

## How it refreshes

`.github/workflows/refresh-feeds.yml` runs every 6 hours (and on demand from the
Actions tab). It runs the three scripts, rebuilds to prove the site still compiles,
and commits any changed data — which triggers the normal Cloudflare Pages deploy.

Run them locally too:

```bash
npm run feeds            # all three
npm run feeds:films      # just films (needs TMDB_API_KEY in your env)
npm run feeds:episodes   # just episodes
npm run feeds:news       # just headlines
```

Every script is **fail-safe**: if a source is unreachable (or the TMDB key is
missing), it logs, leaves the existing data untouched, and exits 0. A bad feed day
never breaks the build or blanks the site.

## One-time setup: the TMDB key (films only)

1. Create a free account at <https://www.themoviedb.org/> → Settings → API, and
   request an API key (choose "Developer").
2. In GitHub: **Settings → Secrets and variables → Actions → New repository secret**.
   Name it `TMDB_API_KEY`, paste the v3 key. (A v4 Read Access Token works too —
   name it `TMDB_BEARER` instead.)

That's it. Episodes and headlines need no keys.

TMDB requires this credit, which the films page already shows:
> This product uses the TMDB API but is not endorsed or certified by TMDB.

## Curating the headlines

Edit `src/data/feeds/news-sources.json` to choose which RSS feeds are aggregated:

```json
{ "feeds": [ { "name": "The Guardian — Soap operas", "url": "https://www.theguardian.com/tv-and-radio/soap-operas/rss" } ] }
```

The aggregator stores **only a headline, its source and a link** — never the article
body — and every link points back to the publisher. That keeps it firmly on the
right side of copyright. Verify each URL resolves to a real RSS/Atom feed; the
script skips any feed that fails.

## What you still write yourself

Original spoilers and news stories are your own articles (`kind: spoiler` /
`kind: news`) — see `docs/sourcing.md`. The feeds above surface *facts* (release
dates, air dates) and *links*; your written pieces are where the editorial voice
lives, and they can't be automated because republishing other outlets' spoiler
copy isn't yours to do.
