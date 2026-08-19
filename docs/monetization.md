# Making money from TV Tattler

Three revenue features are built in and **already live in the layout** — they show
tasteful placeholders until you add your account details, then switch on
automatically. Nothing secret is stored in the repo; you set everything as
build-time variables in Cloudflare.

## 1. Display ads (Google AdSense)

**What's built:** ad slots in the sidebar, inside articles, and on the quiz pages;
a cookie-consent banner wired to Google Consent Mode v2; a generated `/ads.txt`;
and a `/privacy/` page (AdSense won't approve a site without one).

**To switch on:**

1. Apply at <https://adsense.google.com> with the live domain `tvtattler.com`.
   You need real content (you have 280+ pages) and the privacy page (done).
2. Once approved, copy your **publisher ID** (looks like `ca-pub-1234567890123456`).
3. In Cloudflare → your project → **Settings → Variables and Secrets**, add a
   variable:
   - `PUBLIC_ADSENSE_CLIENT` = `ca-pub-…`
4. Redeploy. The AdSense script loads, `/ads.txt` publishes your line, and the
   placeholders become real ads.

**Per-slot ad units (optional, recommended):** AdSense's "Display ads" give you a
slot id per unit. Pass it to the component for better control, e.g.
`<AdSlot slot="1234567890" variant="rectangle" />`. Without a slot id the space
stays a placeholder, so add the ids to `Sidebar.astro`, the article template and
the quiz pages when you have them. (Or just turn on **Auto ads** in AdSense and
let Google place them — the loader is already on every page.)

**Compliance:** UK/EEA law requires a certified consent tool for personalised
ads. The built-in banner sets Consent Mode correctly and is a solid baseline, but
the fully-compliant route is to also switch on **Privacy & messaging → GDPR
message** inside AdSense (it's Google-certified and appears automatically).

## 2. Newsletter (Mailchimp)

**What's built:** a sign-up form in the sidebar, at the end of every article, on
the quiz pages, and a dedicated `/newsletter/` page.

**To switch on:**

1. In Mailchimp, create an audience, then **Audience → Signup forms → Embedded
   forms**. Copy two things from the generated HTML:
   - the form's `action` URL (e.g.
     `https://tvtattler.us21.list-manage.com/subscribe/post?u=abc123&id=def456`)
   - the hidden bot-guard input's `name` (looks like `b_abc123_def456`)
2. In Cloudflare → **Settings → Variables**, add:
   - `PUBLIC_MAILCHIMP_ACTION` = that action URL
   - `PUBLIC_MAILCHIMP_HIDDEN` = that hidden field name
3. Redeploy. The forms go live and start collecting subscribers.

**Why it matters most:** Facebook reach is rented — Meta can throttle it any time.
An email list is yours forever. Drive followers to `/newsletter/` and you can bring
them back without Facebook.

## 3. Quizzes (traffic + shares)

**What's built:** `/quizzes/` with three shareable quizzes (trivia + two
personality quizzes), each with a Facebook share button and "copy link". Quizzes
are the format that travels furthest on Facebook and rack up ad pageviews.

**To add more:** edit `src/data/quizzes.ts` — add a `trivia` or `personality`
object and it appears automatically. Keep trivia answers to safe, evergreen facts
(no invented spoilers or dates).

## Getting traffic from Facebook to convert

- **Post links, not just native videos** — Facebook favours native content, but a
  strong headline + image linking to a quiz or spoiler roundup still travels well.
- **Lead with quizzes and "which … are you?"** — they get shared, and every share
  is free reach.
- **Always funnel to email** — every article and quiz already ends with a sign-up.
- **Volume × pages-per-visit = ad money.** The related-content and quiz links keep
  people clicking, which is exactly what lifts ad revenue.
