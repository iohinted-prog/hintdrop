import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import HomePageClient from "./components/HomePageClient";

export const metadata = {
  title: "HintDrop | Never forget. Always thoughtful.",
  description:
    "HintDrop helps you remember important moments, save better gift ideas, build circles, and explore curated shopping with help from your friends.",
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

  return <HomePageClient />;
}
