// Blog posts, for SEO purposes only - a pure content-marketing
// surface, not a CMS. Each post is plain data; the actual page
// templates (app/blog/page.js, app/blog/[slug]/page.js) handle
// rendering and metadata. Adding a new post means adding an entry
// here - no database, no admin UI, matches the stated scope.
//
// shopLink uses the un-suffixed /gift-shop entry point (not
// /gift-shop-uk or -us directly) so proxy.js's own region-detection
// redirect still runs and sends UK/US visitors to the right regional
// shop - it only rewrites the path, the ?occasion=/?relationship=
// query string passes through untouched to the destination, where
// GiftShopClient.jsx picks it up and pre-applies the filter.

export const BLOG_POSTS = [
  {
    slug: "fathers-day-gift-ideas",
    title: "Father's Day Gift Ideas That Actually Land",
    description: "Thoughtful Father's Day gift ideas for every kind of dad - the golfer, the coffee obsessive, the one who says he doesn't want anything.",
    publishedAt: "2026-09-12",
    shopLink: "/gift-shop?occasion=fathers-day",
    shopLinkLabel: "Browse Father's Day gift ideas",
    intro: "Every Father's Day, the same thing happens: you want to get something better than a tie or a card, but \u201cwhat does Dad actually want\u201d turns out to be a genuinely hard question. He's impossible to buy for because he never asks for anything - so here's where to actually start looking.",
    sections: [
      {
        heading: "Start with what he already does, not what he says he wants",
        body: "Most dads won't tell you what they want, but they'll show you constantly - the same coffee order every morning, the tool he keeps borrowing back off you, the golf gloves that are falling apart. The best Father's Day gifts almost never come from asking \u201cwhat do you want,\u201d they come from paying attention to what he's already reaching for.",
      },
      {
        heading: "When you're stuck, let a group cover something bigger",
        body: "If a few of you (you and your siblings, you and your mum) want to go in on something more meaningful than any one person's budget - a proper set of golf clubs, a weekend away, a good chair - HintDrop's group pots let everyone chip in toward one gift instead of five smaller ones that don't add up to much.",
      },
    ],
  },
];

export function getBlogPost(slug) {
  return BLOG_POSTS.find((p) => p.slug === slug) || null;
}
