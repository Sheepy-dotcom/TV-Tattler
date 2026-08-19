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

  // --- Newsletter (Mailchimp embedded form) ---
  mailchimp: {
    action: (env.PUBLIC_MAILCHIMP_ACTION ?? '').trim(),
    hiddenField: (env.PUBLIC_MAILCHIMP_HIDDEN ?? '').trim(),
  },
} as const;

export const adsEnabled = site.adsenseClient.startsWith('ca-pub-');
export const newsletterEnabled = site.mailchimp.action.startsWith('http');
