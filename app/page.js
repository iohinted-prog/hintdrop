import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import HomePageClient from "./components/HomePageClient";
import { SOCIAL_LINKS } from "./components/SocialLinks";

export const metadata = {
  // Repositioned away from "wishlist" entirely per direct correction -
  // HintDrop isn't a wishlist alternative, it's a social gifting
  // platform: saving what you want for yourself AND saving gift ideas
  // for other people, both directions. Title stays short (38 chars)
  // and leads with that framing directly instead of a category
  // comparison; description carries the "for yourself, for others"
  // duality plus the group-pots differentiator.
  title: { absolute: "HintDrop - The Social Gifting Platform" },
  description: "Save hints for yourself, and gift ideas for the people you love. Remember birthdays, share what matters, and pool money together with group pots.",
  keywords: ["social gifting", "gift ideas", "group gifting", "birthday reminders", "hint list", "gift planning", "group pot", "pool money for gifts"],
  openGraph: {
    title: "HintDrop - The Social Gifting Platform",
    description: "Save hints for yourself, and gift ideas for the people you love. Remember birthdays, share what matters, and pool money together with group pots.",
    url: "https://hintdrop.app",
    siteName: "HintDrop",
    type: "website",
    images: ["https://hintdrop.app/og-default-v2.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "HintDrop - The Social Gifting Platform",
    description: "Save hints for yourself, and gift ideas for the people you love. Remember birthdays, share what matters, and pool money together with group pots.",
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
