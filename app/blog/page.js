import Link from "next/link";
import PublicShell from "../components/PublicShell";
import { BLOG_POSTS } from "../../lib/blogPosts";

export const metadata = {
  title: "Gift Ideas & Guides | HintDrop Blog",
  description: "Gift ideas and guides for every occasion, from HintDrop - the social gifting app for wishlists, reminders, and group gifts.",
  alternates: { canonical: "https://hintdrop.app/blog" },
  openGraph: {
    title: "Gift Ideas & Guides | HintDrop Blog",
    description: "Gift ideas and guides for every occasion, from HintDrop.",
    url: "https://hintdrop.app/blog",
    siteName: "HintDrop",
    type: "website",
    images: ["https://hintdrop.app/og-default-v2.png"],
  },
};

export default function BlogIndexPage() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl px-5 py-14">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#c1846c]">HintDrop Blog</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-slate-900 sm:text-4xl">
          Gift ideas and guides for every occasion
        </h1>
        <p className="mt-4 text-[17px] leading-8 text-slate-600">
          Practical gift ideas, organised by occasion - and a straight line from each one into the actual shop.
        </p>

        <div className="mt-10 space-y-6">
          {BLOG_POSTS.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="block rounded-[24px] border border-[#eadfd4] bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)] transition hover:border-[#f0c9b5] sm:p-8"
            >
              <h2 className="text-xl font-semibold text-slate-900">{post.title}</h2>
              <p className="mt-2 text-[15px] leading-7 text-slate-600">{post.description}</p>
              <span className="mt-3 inline-block text-sm font-semibold text-[#df7b59]">Read more →</span>
            </Link>
          ))}
        </div>
      </div>
    </PublicShell>
  );
}
