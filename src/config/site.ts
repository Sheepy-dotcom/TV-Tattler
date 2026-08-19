// -----------------------------------------------------------------------------
// Site-wide configuration for the money-making layer (ads + newsletter).
//
// Nothing secret lives here. Each value is read from a PUBLIC_ build-time
// environment variable so you can set it in the Cloudflare Pages/Workers project
// (Settings → Variables) without touching the code. Until a value is set, the
// site renders tasteful placeholders instead of live ad/newsletter code — so the
// layout always looks finished, and you flip everything on by adding the vars.
//
// Set these in Cloudflare (or a local .env for testing):
//   PUBLIC_ADSENSE_CLIENT   e.g. "ca-pub-1234567890123456"  (your AdSense ID)
//   PUBLIC_MAILCHIMP_ACTION the full Mailchimp form "action" URL from the
//                           embedded-form code, e.g.
//                           "https://tvtattler.us21.list-manage.com/subscribe/post?u=abc123&id=def456"
//   PUBLIC_MAILCHIMP_HIDDEN the bot-guard hidden field name Mailchimp gives you,
//                           e.g. "b_abc123_def456"
// -----------------------------------------------------------------------------

const env = import.meta.env;

export const site = {
  name: 'TV Tattler',

  // --- Advertising (Google AdSense) ---
  // The publisher ID. Empty string = ads not configured yet → placeholders show.
  adsenseClient: (env.PUBLIC_ADSENSE_CLIENT ?? '').trim(),

  // --- Newsletter (Mailchimp) ---
  mailchimp: {
    // Embedded-form POST endpoint — powers the inline forms in the sidebar,
    // articles and quiz pages. These are public values from the Mailchimp
    // embedded-form code (Audience → Signup forms → Embedded forms): the form's
    // `action` URL and the hidden bot-guard field name. Safe to commit; override
    // via PUBLIC_MAILCHIMP_ACTION / PUBLIC_MAILCHIMP_HIDDEN if the account changes.
    action: (
      env.PUBLIC_MAILCHIMP_ACTION ??
      'https://tvtattler.us12.list-manage.com/subscribe/post?u=0b9a98e19004883bc4b202ddf&id=c2e618396a&f_id=00c154e1f0'
    ).trim(),
    hiddenField: (
      env.PUBLIC_MAILCHIMP_HIDDEN ?? 'b_0b9a98e19004883bc4b202ddf_c2e618396a'
    ).trim(),
    // Mailchimp "Connected Site" script — enables Mailchimp-hosted pop-up and
    // embedded forms you design in Mailchimp's UI, plus audience analytics.
    // This is a public, per-account client script (safe to commit). Override
    // via PUBLIC_MAILCHIMP_MCJS if the account ever changes.
    connectedJs: (
      env.PUBLIC_MAILCHIMP_MCJS ??
      'https://chimpstatic.com/mcjs-connected/js/users/0b9a98e19004883bc4b202ddf/3ddf8a6be09daaa79e1f67fd3.js'
    ).trim(),
  },
} as const;

export const adsEnabled = site.adsenseClient.startsWith('ca-pub-');
export const newsletterEnabled = site.mailchimp.action.startsWith('http');
export const mailchimpConnected = site.mailchimp.connectedJs.startsWith('http');
