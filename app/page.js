import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import HomePageClient from "./components/HomePageClient";

export const metadata = {
  // Title carries the real SEO weight via "wishlist" (an actual
  // search term, unlike "social gifting" which nobody searches for)
  // while still leading into the brand identity right behind it,
  // rather than choosing one or the other. "App" not "Platform" -
  // concrete and specific, and this is a Google search result sitting
  // next to articles/other sites/tools, not an App Store listing
  // where "app" would be redundant - telling someone up front what
  // kind of thing this is is real information here, not filler.
  // Keyword-first, brand last - deliberately not "HintDrop - ..."
  // despite the earlier drafts here doing exactly that. Researched
  // this properly rather than going with instinct: title-tag studies
  // consistently find keyword-first outperforms brand-first UNLESS
  // the brand already has real recognition/branded search volume -
  // at pre-1000-users stage, HintDrop doesn't yet, so keyword-first
  // is the evidence-backed choice here, not a stylistic preference.
  // "Wishlists" and "Group Gifts" lead because they're the only two
  // terms in this space with actual demonstrated search demand
  // (checked the real competitive landscape - GiftList, Giftster,
  // Elfster, MyRegistry, Ouish all lead with "wishlist"; "social
  // gifting" has no demonstrated search volume anywhere in the
  // category). "for the People You Love" carries the others-focused
  // framing research supports over self-focused framing in gifting
  // contexts specifically.
  title: { absolute: "Wishlists & Group Gifts for the People You Love | HintDrop" },
  description: "More than a wishlist or a notes app - never forget a birthday, take the guesswork out of gifting, and organise group gifts together with HintDrop.",
  keywords: ["social gifting", "wishlist app", "gift ideas", "group gifting", "birthday reminders", "hint list", "gift planning", "group pot", "pool money for gifts"],
  openGraph: {
    title: "Wishlists & Group Gifts for the People You Love | HintDrop",
    description: "You craft the moments. We remember the details.",
    url: "https://hintdrop.app",
    siteName: "HintDrop",
    type: "website",
    images: ["https://hintdrop.app/og-default-v2.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Wishlists & Group Gifts for the People You Love | HintDrop",
    description: "You craft the moments. We remember the details.",
    images: ["https://hintdrop.app/og-default-v2.png"],
  },
  alternates: {
    canonical: "https://hintdrop.app",
  },
  other: {
    "impact-site-verification": "e9b128fe-f48f-4547-98f7-037ee4183d82",
  },
};

export default async function Page() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/feed");
  }

  // Organization/WebSite structured data now lives once, in
  // app/layout.js (which wraps every page including this one) - was
  // duplicated here too with a different logo URL and a stale
  // description, meaning the homepage emitted two disagreeing copies
  // of the same schema types. This @graph now only carries what's
  // genuinely specific to the homepage: the SoftwareApplication entry.
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      // Added now that the situation is genuinely different from when
      // this was first considered - deliberately skipped earlier this
      // session because the example being copied claimed iOS/Android
      // support and USD pricing, neither of which was true at the time
      // (no native app existed, company is UK/GBP). An iOS app now
      // genuinely exists and has been submitted for App Store review,
      // so operatingSystem below is now accurate rather than
      // aspirational. Still deliberately not claiming Android - no
      // Android build exists yet. Price/currency match the App Store
      // submission itself (free, no in-app purchases).
      {
        "@type": "SoftwareApplication",
        name: "HintDrop",
        url: "https://hintdrop.app",
        applicationCategory: "LifestyleApplication",
        operatingSystem: "iOS, Web",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "GBP",
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomePageClient />
    </>
  );
}
