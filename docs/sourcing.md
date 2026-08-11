# Sourcing guide

How TV Tattler uses official sources — especially the **BBC Media Centre** and
**ITV Press Centre** — for spoilers, cast changes and images, without breaking
any rules.

## The one rule that matters

**Facts are free to reuse; the words and images around them are not.**

A press release tells you *what* is happening (a cast arrival, a storyline, a
transmission date). You may state those facts. You may **not** copy the release's
sentences, and you may **not** use its images unless you are licensed to.

So the workflow is always: read the source → take the facts → **write your own
prose** → cite the source.

## Getting legitimate access

- **BBC Media Centre** — <https://www.bbc.co.uk/mediacentre>. Register for press
  access to receive releases, forward-planning and licensed images.
- **ITV Press Centre** — <https://www.itv.com/presscentre>. Same idea for
  Coronation Street, Emmerdale and other ITV shows.

These provide material *for editorial use to promote the programmes*. Use them
that way.

## Text

- Never paste release text. Extract the facts and write them up yourself.
- Cite the source on the article via the `sources` field (see below). Link to
  the specific release where you can, not just the landing page.
- Don't present a rewritten release as reporting you did — it's an explainer
  built on an official announcement, and the citation makes that honest.

## Images

- Only use images you are licensed for. Press images are typically **editorial
  use, credited, unaltered**, and sometimes time-limited. Read the terms on each.
- Always set `imageCredit` (e.g. `"© BBC"`, `"© ITV"`) — the article renders it.
- Don't hotlink other outlets' images or lift stills from iPlayer/ITVX.
- Wikimedia Commons and TMDB are alternatives — mind each file's licence.

## What NOT to do

- No scraping BBC/ITV (or Digital Spy, Radio Times, tabloids…) to auto-publish
  their text. It breaks copyright and their terms.
- No bulk-copying a database (the UK database right).
- No auto-posting unreviewed content — a human writes and checks every article.

## The tooling

### Cite sources on an article

Add to the article's frontmatter:

```yaml
sources:
  - title: EastEnders — new arrival announced
    url: https://www.bbc.co.uk/mediacentre/...   # deep-link the release
    publisher: BBC Media Centre
imageCredit: "© BBC"      # if you use a licensed image
image: /images/....jpg    # optional
```

The article page renders a **Sources** block linking out, plus the image credit.

### Scaffold a sourced article

`npm run new` records the facts and the source and leaves you an empty body to
write in your own words (it creates the file as `draft: true`):

```bash
npm run new -- \
  --title "New face joins the Rovers Return" \
  --section soaps --kind cast-change \
  --show coronation-street --person some-actor \
  --source-url "https://www.itv.com/presscentre/..." \
  --source-publisher "ITV Press Centre"
```

Then open the created file, write the standfirst and body, set `draft: false`,
and commit.

## Image suggestions from Wikidata → Commons

The enrichment also looks up each person's/show's image (Wikidata property P18,
which points to **Wikimedia Commons**) and records the file **with its author and
licence** — a ready-made credit line. This is a *suggestion only*: nothing is
shown until you opt in.

- During `astro dev`, an entity with a suggestion but no image shows a small
  amber review note with the credit.
- To use it, set `useWikidataImage: true` in the person/show frontmatter — the
  page then shows the Commons image with the licence credit filled in.
- With `useWikidataImage: true`, the Commons image is **preferred** and the
  self-hosted illustration becomes the fallback.
- Name matching is disambiguated by entity type, exact name, acting occupation,
  UK citizenship and a hint from `knownFor` (so the British "Michelle Collins"
  is chosen over the American TV host). For total certainty, **pin the QID**
  with `wikidata: Q…` — that skips name resolution entirely.
- Always eyeball the first refresh: the rendered credit line names the source.
- Commons licences are usually **CC BY-SA** (credit required, sometimes
  share-alike). The credit line covers attribution; check the licence link
  before relying on it, and prefer downloading + self-hosting for production.

## Reference facts (dates, episode counts)

These come from **Wikidata (CC0)** via the build-time enrichment
(`npm run enrich`, refreshed daily by `.github/workflows/refresh-data.yml`).
See `scripts/enrich-wikidata.mjs`. Wikidata is public domain; we credit it and
link out anyway.
