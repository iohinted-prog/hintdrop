import Link from "next/link";
import PublicShell from "../components/PublicShell";
import { BLOG_POSTS } from "../../lib/blogPosts";
import { getTopProductsFor, filtersFromShopLink } from "../../lib/blogProducts";

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

function PostCard({ post, coverImage }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group block overflow-hidden rounded-[22px] border border-[#eadfd4] bg-white shadow-[0_16px_40px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-[#f0c9b5] hover:shadow-[0_20px_48px_rgba(15,23,42,0.09)]"
    >
      <div className="relative h-36 w-full overflow-hidden bg-[#f5ece6]">
        {coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverImage}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl">🎁</div>
        )}
      </div>
      <div className="p-5">
        <h3 className="text-[16px] font-semibold text-slate-900">{post.title}</h3>
        <p className="mt-1.5 text-[14px] leading-6 text-slate-600">{post.description}</p>
        <span className="mt-2.5 inline-flex items-center gap-1 text-sm font-semibold text-[#df7b59]">
          Read more
          <span aria-hidden className="transition group-hover:translate-x-0.5">→</span>
        </span>
      </div>
    </Link>
  );
}

export default async function BlogIndexPage() {
  // Category derived from each post's own shopLink rather than a
  // separate field to keep in sync - every post already encodes
  // whether it's occasion- or relationship-based in the link it
  // already has.
  const occasionPosts = BLOG_POSTS.filter((p) => p.shopLink.includes("occasion="));
  const relationshipPosts = BLOG_POSTS.filter((p) => p.shopLink.includes("relationship="));

  // One representative product image per post, for a real visual
  // index instead of plain text cards - a stylised gift-guide hub
  // should actually look like one. Pulls just the single top-ranked
  // item per post (not the full list every post page fetches), kept
  // cheap since this runs once at build time for a static page.
  const coverImages = {};
  await Promise.all(
    BLOG_POSTS.map(async (post) => {
      const { occasion, relationship } = filtersFromShopLink(post.shopLink);
      const [top] = await getTopProductsFor({ occasion, relationship, limit: 1 });
      if (top?.image_url) coverImages[post.slug] = top.image_url;
    })
  );

  return (
    <PublicShell>
      <div className="bg-gradient-to-b from-[#fff4ee] to-transparent">
        <div className="mx-auto max-w-5xl px-5 pb-10 pt-14">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#c1846c]">HintDrop Blog</p>
          <h1 className="mt-3 max-w-2xl text-3xl font-semibold tracking-[-0.03em] text-slate-900 sm:text-4xl">
            Gift ideas and guides for every occasion
          </h1>
          <p className="mt-4 max-w-2xl text-[17px] leading-8 text-slate-600">
            Real, curated picks - organised by occasion and by who you're buying for - with a straight line from each one into the actual shop.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-5 pb-16">
        <section className="mt-4">
          <h2 className="text-xl font-semibold text-slate-900">By occasion</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {occasionPosts.map((post) => (
              <PostCard key={post.slug} post={post} coverImage={coverImages[post.slug]} />
            ))}
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-xl font-semibold text-slate-900">By who you're buying for</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {relationshipPosts.map((post) => (
              <PostCard key={post.slug} post={post} coverImage={coverImages[post.slug]} />
            ))}
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
