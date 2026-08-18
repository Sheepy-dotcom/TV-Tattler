# The editing studio (`/admin/`)

A web form for adding your own **spoilers and news** from any device — no code, no
local checkout. It commits markdown straight to the repo, so publishing here goes
live on the next Cloudflare build.

It uses [Sveltia CMS](https://github.com/sveltia/sveltia-cms) (a modern, phone-
friendly editor). Everything is already in the repo:

- `public/admin/index.html` — loads the editor
- `public/admin/config.yml` — defines the "Spoilers & news" form (headline,
  standfirst, kind, section, spoiler toggle, date, the shows/cast/characters it's
  about, sources, image, body)

You just need to connect it to GitHub **once**.

## One-time setup (about 10 minutes)

Because the site is on Cloudflare Pages (not Netlify), sign-in goes through a tiny
auth helper. The maintainers of Sveltia provide one you deploy in a couple of clicks.

**1. Create a GitHub OAuth app**
GitHub → Settings → Developer settings → **OAuth Apps** → **New OAuth App**.
- Application name: `TV Tattler Studio`
- Homepage URL: your live site, e.g. `https://tvtattler.com`
- Authorization callback URL: `https://<your-auth-worker>.workers.dev/callback`
  (you'll get this URL in step 2 — you can edit it right after)
- Save, then note the **Client ID** and generate a **Client secret**.

**2. Deploy the auth helper (Cloudflare Worker)**
Follow the one-page guide at <https://github.com/sveltia/sveltia-cms-auth>. It's a
"Deploy to Cloudflare" button; set two variables when prompted:
- `GITHUB_CLIENT_ID` = the Client ID from step 1
- `GITHUB_CLIENT_SECRET` = the Client secret from step 1

It gives you a worker URL like `https://sveltia-cms-auth.<you>.workers.dev`. Put
`<that-url>/callback` back into the GitHub app's callback field (step 1).

**3. Point the CMS at your auth helper**
In `public/admin/config.yml`, under `backend:`, add one line:

```yaml
backend:
  name: github
  repo: Sheepy-dotcom/TV-Tattler
  branch: main
  base_url: https://sveltia-cms-auth.<you>.workers.dev   # <-- your worker URL
```

Commit that. Done.

## Using it day to day

1. Go to `https://<your-site>/admin/` on any device.
2. Sign in with GitHub (first time only authorises the app).
3. **Spoilers & news → New Story.** Fill the form:
   - Headline + standfirst
   - Kind = *Spoiler* (or News / Cast change…)
   - Tick the shows/cast/characters it's about so it auto-links across the site
   - Add **Sources** (link the outlet you're citing — don't paste their text)
   - Write your story in the body
4. **Publish.** It commits a markdown file to `src/content/articles/`; Cloudflare
   rebuilds and it's live in a minute or two. Save as a **Draft** to hold it back.

## The rule that keeps you safe

The form nudges you toward it, but to be explicit: write **facts and your own words**.
Cite other outlets under Sources and link out — never paste their spoiler copy. That
distinction (your words + links vs. republished text) is what keeps the site legal.

## Prefer no self-hosted auth?

[Pages CMS](https://pagescms.org) is an alternative that needs no OAuth worker — you
install its GitHub App and log in on their site. If you'd rather go that route, say
so and it can be configured instead; the field definitions carry over almost as-is.
