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

function PostCard({ post }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="block rounded-[22px] border border-[#eadfd4] bg-white/80 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)] transition hover:border-[#f0c9b5]"
    >
      <h3 className="text-[16px] font-semibold text-slate-900">{post.title}</h3>
      <p className="mt-1.5 text-[14px] leading-6 text-slate-600">{post.description}</p>
      <span className="mt-2 inline-block text-sm font-semibold text-[#df7b59]">Read more →</span>
    </Link>
  );
}

export default function BlogIndexPage() {
  // Category derived from each post's own shopLink rather than a
  // separate field to keep in sync - every post already encodes
  // whether it's occasion- or relationship-based in the link it
  // already has.
  const occasionPosts = BLOG_POSTS.filter((p) => p.shopLink.includes("occasion="));
  const relationshipPosts = BLOG_POSTS.filter((p) => p.shopLink.includes("relationship="));

  return (
    <PublicShell>
      <div className="mx-auto max-w-5xl px-5 py-14">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#c1846c]">HintDrop Blog</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-slate-900 sm:text-4xl">
          Gift ideas and guides for every occasion
        </h1>
        <p className="mt-4 max-w-2xl text-[17px] leading-8 text-slate-600">
          Practical gift ideas, organised by occasion and by who you're buying for - and a straight line from each one into the actual shop.
        </p>

        <section className="mt-12">
          <h2 className="text-xl font-semibold text-slate-900">By occasion</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {occasionPosts.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-xl font-semibold text-slate-900">By who you're buying for</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {relationshipPosts.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
