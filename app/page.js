import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import HomePageClient from "./components/HomePageClient";

export const metadata = {
  title: "HintDrop | Never forget. Always thoughtful.",
  description: "Save what you actually want. Remember who matters. Plan gifts together. HintDrop is the thoughtful gifting app for hints, reminders, and group gifting.",
  keywords: ["gift ideas", "wishlist app", "group gifting", "birthday reminders", "hint list", "gift planning"],
  openGraph: {
    title: "HintDrop | Never forget. Always thoughtful.",
    description: "Save what you actually want. Remember who matters. Plan gifts together.",
    url: "https://hintdrop.app",
    siteName: "HintDrop",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "HintDrop | Never forget. Always thoughtful.",
    description: "Save what you actually want. Remember who matters. Plan gifts together.",
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
        logo: "https://hintdrop.app/favicon.png",
      },
      {
        "@type": "WebSite",
        name: "HintDrop",
        url: "https://hintdrop.app",
        description: "Save what you actually want. Remember who matters. Plan gifts together.",
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
