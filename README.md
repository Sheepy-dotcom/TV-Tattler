# TV Tattler

A soaps-first UK entertainment site built on **evergreen reference depth** —
complete, accurate, well-maintained pages for every show, character and actor.
Articles keep things fresh; the reference pages are the product.

- **Stack:** Astro 5 (static output), TypeScript strict, markdown content
  collections. No database, no CMS. Deploys to Cloudflare Pages.
- **Zero client-side JavaScript** except where a feature needs it (only the
  search page ships JS).

## Quick start

```bash
npm install
npm run dev        # local dev server (drafts are visible here)
npm run build      # production build to dist/ (drafts hidden)
npm run preview    # serve the built site
npm run check      # astro check — TypeScript + template diagnostics
```

## Authoring content

Content lives in `src/content/` as markdown with typed frontmatter
(`src/content.config.ts`). Four collections:

- **shows** — `title, broadcaster, section, accent (hex), startYear, endYear?, airs?, summary`
- **people** — `name, born?, knownFor, summary`
- **characters** — `name, show→ref, status, summary, family[→refs]`, and
  **`portrayals[]`** (one row per stint: `{ person→ref, from, to?, note? }`) —
  the single most important field on the site.
- **articles** — `title, standfirst, section, kind, publishedAt, author,
  shows[], characters[], people[], tags[], spoiler, lead, draft`, plus optional
  `image`, `imageCredit`, `sources[]`.

Two rules make the cross-linking work:

1. **An article lives in exactly one `section`** (`soaps`, `tv-and-film`,
   `celebrities`, `news`). Cross-cutting types are a **`kind`** (`news`,
   `feature`, `spoiler`, `cast-change`, `review`, `guide`) — so "spoilers" and
   "cast changes" get their own listings without becoming rival sections.
2. **Articles never link to each other.** They point at entities; all the
   cross-linking (a show's coverage, an actor's roles, "read next") is derived
   in `src/lib/relations.ts`.

### Scaffold an article

`npm run new` records the facts and the official source and leaves you an empty
body to write in your own words (created as `draft: true`):

```bash
npm run new -- \
  --title "New face joins the Rovers Return" \
  --section soaps --kind cast-change \
  --show coronation-street --person some-actor \
  --source-url "https://www.itv.com/presscentre/..." \
  --source-publisher "ITV Press Centre"
```

## Live data & sourcing

- **Facts (CC0):** `npm run enrich` pulls stable facts from **Wikidata** (birth
  dates, inception, episode counts, Wikipedia links) into
  `src/data/wikidata.json`, and suggests a **Wikimedia Commons** image *with its
  licence credit* — used only when a page sets `useWikidataImage: true`.
- **Spoilers / cast changes:** work from the **BBC Media Centre** / **ITV Press
  Centre** — cite the source, write your own words, credit any image.
- Full rules and the image-approval flow: **[`docs/sourcing.md`](docs/sourcing.md)**.

The daily **`.github/workflows/refresh-data.yml`** runs `enrich`, and commits
the refreshed cache — which triggers a Cloudflare redeploy.

## Routes

`/` · `/section/[section]/` · `/kind/[kind]/` (spoilers is a bespoke hub) ·
`/articles/[slug]/` · `/shows/` · `/shows/[slug]/` · `/characters/[slug]/` ·
`/people/[slug]/` · `/about/` · `/search/` · `/rss.xml` · `/sitemap-index.xml`

## Deploy to Cloudflare Pages

1. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**,
   pick this repository.
2. **Build command:** `npm run build` · **Output directory:** `dist` ·
   **Node version:** 20 or newer.
3. Deploy. Every push auto-deploys; the scheduled workflow keeps facts fresh.

## Before launch

- Register for BBC/ITV press access; replace placeholder source URLs and the
  contact email (`src/pages/about.astro`) with real ones.
- Swap placeholder cover art (`public/images/`) for licensed photos, or opt in
  to Commons images.
- Optionally pin Wikidata QIDs (`wikidata: Q…`) on people/shows.
- Double-check editorial choices flagged in content comments (show accent
  colours, air-date schedules, actor dates of birth).
