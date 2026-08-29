// Private/authenticated app routes - excluded from every crawler
// (AI or traditional), same list either way. This isn't an AI-SEO
// decision, it's just "don't index pages that need a login."
const PRIVATE_ROUTES = [
  "/feed",
  "/hints",
  "/circle",
  "/account",
  "/settings",
  "/onboarding",
  "/circles-legacy",
  "/calendar",
  "/shop",
  "/invite",
  "/join",
  "/profile",
  "/billing",
  "/auth",
  "/api/",
];

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: PRIVATE_ROUTES,
      },
      // Explicit AI crawler rules, on top of the wildcard above. Some
      // crawlers specifically check for their own named rule rather
      // than falling back to "*", so being explicit is a genuine
      // signal, not just documentation. All allowed here - the goal
      // of this pass is maximizing AI visibility/citations, and there
      // was no existing restriction on any of these to begin with
      // (the previous wildcard-only rule already implicitly allowed
      // all of them; this just makes that explicit rather than
      // changing the actual policy).
      //
      // Real-time search/retrieval crawlers - these power live
      // citations in AI-generated answers (ChatGPT Search, Perplexity
      // answers, Claude's web search). Blocking these is what actually
      // removes a site from AI search results - the single most
      // direct lever for "AI SEO" specifically.
      { userAgent: "OAI-SearchBot", allow: "/", disallow: PRIVATE_ROUTES },
      { userAgent: "ChatGPT-User", allow: "/", disallow: PRIVATE_ROUTES },
      { userAgent: "Claude-SearchBot", allow: "/", disallow: PRIVATE_ROUTES },
      { userAgent: "Claude-User", allow: "/", disallow: PRIVATE_ROUTES },
      { userAgent: "PerplexityBot", allow: "/", disallow: PRIVATE_ROUTES },
      { userAgent: "Perplexity-User", allow: "/", disallow: PRIVATE_ROUTES },
      // Bulk training crawlers - feed model training datasets rather
      // than powering live answers directly. Some sites choose to
      // block these specifically while allowing the search crawlers
      // above; left allowed here since there's no stated concern
      // about training use, matching the site's existing open stance
      // rather than introducing a new restriction.
      { userAgent: "GPTBot", allow: "/", disallow: PRIVATE_ROUTES },
      { userAgent: "ClaudeBot", allow: "/", disallow: PRIVATE_ROUTES },
      { userAgent: "anthropic-ai", allow: "/", disallow: PRIVATE_ROUTES },
      { userAgent: "Google-Extended", allow: "/", disallow: PRIVATE_ROUTES },
      { userAgent: "Applebot-Extended", allow: "/", disallow: PRIVATE_ROUTES },
      { userAgent: "Amazonbot", allow: "/", disallow: PRIVATE_ROUTES },
      { userAgent: "CCBot", allow: "/", disallow: PRIVATE_ROUTES },
    ],
    sitemap: "https://hintdrop.app/sitemap.xml",
  };
}
