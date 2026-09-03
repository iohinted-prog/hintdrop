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

export const metadata = {
  title: "HintDrop Chrome Extension",
  description: "Save gift ideas straight from any product page, without leaving your browser.",
  openGraph: {
    images: ["https://hintdrop.app/og-default.png"],
    title: "HintDrop Chrome Extension",
    description: "Save gift ideas straight from any product page, without leaving your browser.",
    url: "https://hintdrop.app/extension",
    siteName: "HintDrop",
    type: "website",
  },
  alternates: { canonical: "https://hintdrop.app/extension" },
};

export default async function ExtensionPage() {
  const user = await getUser();

  const inner = (
    <main className="min-h-screen bg-[#fffaf7] text-slate-800">
      <section className="px-6 py-12 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 rounded-[28px] border border-[#eadfd4] bg-white/80 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:p-10">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#c1846c]">
              Coming soon
            </p>
            <h1 className="mb-4 text-3xl font-bold text-slate-900 sm:text-4xl">
              The HintDrop Chrome Extension
            </h1>
            <p className="mb-4 text-slate-600">
              Some shops don&apos;t make it easy to grab a product&apos;s photo, name, and price
              automatically. The HintDrop extension reads the page directly, right from your
              own browser, while you&apos;re already looking at it — so you can save the exact
              details, even from the trickiest sites.
            </p>
            <p className="mb-6 text-slate-600">
              It&apos;s in final testing right now and will be available on the Chrome Web Store
              soon. Check back here — this page will turn into a one-click install as soon as
              it&apos;s live.
            </p>
            <div className="inline-flex h-12 cursor-not-allowed items-center justify-center rounded-full border border-[#ead8ce] bg-[#f3ece3] px-6 text-sm font-semibold text-slate-400">
              Coming soon to the Chrome Web Store
            </div>
          </div>
        </div>
      </section>
    </main>
  );

  return <PublicShell user={user}>{inner}</PublicShell>;
}
