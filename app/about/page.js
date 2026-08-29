import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import PublicShell from "../components/PublicShell";

async function getUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

import Link from "next/link";

export const metadata = {
  title: "About HintDrop",
  description: "HintDrop helps you save gift ideas, remember birthdays and milestones, and plan group gifts with friends. Built for people who care about getting it right.",
  openGraph: {
    title: "About HintDrop",
    description: "HintDrop helps you save gift ideas, remember birthdays and milestones, and plan group gifts with friends. Built for people who care about getting it right.",
    url: "https://hintdrop.app/about",
    siteName: "HintDrop",
    type: "website",
  },
  alternates: { canonical: "https://hintdrop.app/about" },
};

export default async function AboutPage() {
  const user = await getUser();
  const inner = (
    <main className="min-h-screen bg-[#fffaf7] text-slate-800">
        <section className="px-6 py-12 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 rounded-[28px] border border-[#eadfd4] bg-white/80 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:p-10">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#c1846c]">
              About HintDrop
            </p>
            <h1 className="text-3xl font-semibold tracking-[-0.03em] text-slate-900 sm:text-4xl">
              Save hints. Remember people. Plan gifts together.
            </h1>
            <p className="mt-4 text-[17px] leading-8 text-slate-600">
              HintDrop is a wishlist and gifting app built around the people you care about. Save hints from any retailer, remember birthdays and milestones, and plan group gifts with friends — all in one place.
            </p>
          </div>

          <div className="space-y-6 rounded-[28px] border border-[#eadfd4] bg-white/80 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:p-10">
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
                Why HintDrop exists
              </h2>
              <p className="text-[17px] leading-8 text-slate-700">
                Giving thoughtful gifts should feel exciting, not stressful.
                HintDrop was created to make it easier to stay on top of
                birthdays, celebrations, and meaningful moments without relying
                on scattered notes, forgotten tabs, or last-minute scrambling.
              </p>
              <p className="text-[17px] leading-8 text-slate-700">
                The goal is simple: help people become more intentional in their
                relationships by making reminders, gift discovery, and planning
                feel beautifully organised in one place.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
                What you can do with HintDrop
              </h2>
              <p className="text-[17px] leading-8 text-slate-700">
                HintDrop brings together hint lists, birthday reminders, group gifting circles, and a curated gift shop — so the right idea is always within reach when it matters.
              </p>
              <ul className="space-y-3 text-[17px] leading-8 text-slate-700">
                <li>- Save hints from any retailer — title, image, and price pulled automatically.</li>
                <li>- Remember birthdays, anniversaries, and milestones with gentle reminders.</li>
                <li>- Plan group gifts with friends through circles — coordinate who contributes what.</li>
                <li>- Browse a curated gift shop built around the people and occasions that matter.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
                How the experience works
              </h2>
              <p className="text-[17px] leading-8 text-slate-700">
                Sign up with Google, save your first hint from any product page, and add the people who matter. HintDrop builds around your relationships — so when a birthday comes up, you already know what to get.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
                Our approach
              </h2>
              <p className="text-[17px] leading-8 text-slate-700">
                We believe the best gifting tools should be useful, calm, and
                personal. HintDrop is being built to reduce friction around
                remembering, planning, and discovering, while keeping the focus
                on real relationships rather than generic shopping.
              </p>
              <p className="text-[17px] leading-8 text-slate-700">
                As HintDrop grows, the aim is to keep improving how people
                organise their ideas, manage important moments, and give with
                more confidence and thought.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
                Contact
              </h2>
              <p className="text-[17px] leading-8 text-slate-700">
                Questions, feedback, or partnership enquiries can be sent to{" "}
                <a
                  href="mailto:hello@hintdrop.app"
                  className="font-medium text-slate-900 underline decoration-[#d8b3a3] underline-offset-4"
                >
                  hello@hintdrop.app
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
  if (!user) return <PublicShell>{inner}</PublicShell>;
  return inner;
}
