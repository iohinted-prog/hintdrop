import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import HomePageClient from "./components/HomePageClient";
import { SOCIAL_LINKS } from "./components/SocialLinks";

export const metadata = {
  // Title carries the real SEO weight via "wishlist" (an actual
  // search term, unlike "social gifting" which nobody searches for)
  // while still leading into the brand identity right behind it,
  // rather than choosing one or the other. "App" not "Platform" -
  // concrete and specific, and this is a Google search result sitting
  // next to articles/other sites/tools, not an App Store listing
  // where "app" would be redundant - telling someone up front what
  // kind of thing this is is real information here, not filler.
  title: { absolute: "HintDrop - Not Just a Wishlist. Social Gifting App." },
  description: "More than a wishlist or a notes app - never forget a birthday, take the guesswork out of gifting, and organise group gifts together with HintDrop.",
  keywords: ["social gifting", "wishlist app", "gift ideas", "group gifting", "birthday reminders", "hint list", "gift planning", "group pot", "pool money for gifts"],
  openGraph: {
    title: "HintDrop - Not Just a Wishlist. Social Gifting App.",
    description: "You craft the moments. We remember the details.",
    url: "https://hintdrop.app",
    siteName: "HintDrop",
    type: "website",
    images: ["https://hintdrop.app/og-default-v2.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "HintDrop - Not Just a Wishlist. Social Gifting App.",
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

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "HintDrop",
        url: "https://hintdrop.app",
        // Was pointing at the 64x64 favicon — using the new 192x192
        // icon instead, since Google's Organization/Logo guidance wants
        // a reasonably large square image (112x112 minimum).
        logo: "https://hintdrop.app/icon-192-v3.png",
        // Real, live social/entity profiles — the strongest signal for
        // a Knowledge Panel, per the SocialLinks component (single
        // source of truth, also used for the visible footer/homepage
        // icon links).
        sameAs: SOCIAL_LINKS.map((s) => s.href),
      },
      {
        "@type": "WebSite",
        name: "HintDrop",
        url: "https://hintdrop.app",
        description: "Save what you actually want. Remember who matters. Plan gifts together.",
      },
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
