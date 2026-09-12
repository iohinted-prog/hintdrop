import Link from "next/link";
import { notFound } from "next/navigation";
import PublicShell from "../../components/PublicShell";
import { BLOG_POSTS, getBlogPost } from "../../../lib/blogPosts";
import { getTopProductsFor, filtersFromShopLink } from "../../../lib/blogProducts";

// Static generation - this is content-marketing copy that doesn't
// change per-visitor or per-request, so there's no reason to pay a
// server round-trip on every load the way the app's real data pages
// need to. Also means every post gets pre-rendered at build time,
// which matters for a page whose whole purpose is being fast for
// Google to crawl.
export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return { title: "Blog | HintDrop" };
  return {
    title: `${post.title} | HintDrop Blog`,
    description: post.description,
    alternates: { canonical: `https://hintdrop.app/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      url: `https://hintdrop.app/blog/${post.slug}`,
      siteName: "HintDrop",
      type: "article",
      images: ["https://hintdrop.app/og-default-v2.png"],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: ["https://hintdrop.app/og-default-v2.png"],
    },
  };
}

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const { occasion, relationship } = filtersFromShopLink(post.shopLink);
  const products = await getTopProductsFor({ occasion, relationship, limit: 20 });

  // Cross-category related reads - an occasion post (e.g. Father's
  // Day) surfaces relationship posts (Dad, Husband...) and vice
  // versa, rather than only ever pointing within its own category.
  // Contextual links like these carry real SEO weight (distributing
  // authority between related pages, giving crawlers - and readers -
  // an actual next step) beyond just the nav/footer links to the
  // blog index itself.
  const isOccasionPost = post.shopLink.includes("occasion=");
  const relatedPosts = BLOG_POSTS
    .filter((p) => p.slug !== post.slug && p.shopLink.includes(isOccasionPost ? "relationship=" : "occasion="))
    .slice(0, 3);

  return (
    <PublicShell>
      <article className="mx-auto max-w-2xl px-5 py-14">
        <Link href="/blog" className="text-sm font-semibold text-[#df7b59]">← Back to blog</Link>
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-[#c1846c]">Gift Guide</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-slate-900 sm:text-4xl">
          {post.title}
        </h1>
        <p className="mt-4 text-[17px] leading-8 text-slate-600">{post.intro}</p>

        <Link
          href={post.shopLink}
          className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] px-7 text-sm font-semibold text-white shadow-lg"
        >
          {post.shopLinkLabel}
        </Link>

        {products.length > 0 && (() => {
          const rawLabel = post.shopLinkLabel.replace(/^Browse /i, "").replace(/ gift ideas$/i, "");
          const listLabel = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);
          return (
          <div className="mt-12">
            <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
              {products.length >= 12 ? `Top ${products.length} Gifts` : "Our Picks"} for {listLabel}
            </h2>
            <ol className="mt-6 space-y-5">
              {products.map((product, i) => {
                const outboundUrl = product.affiliate_url || product.product_url;
                return (
                  <li key={product.id} className="flex gap-4 rounded-[20px] border border-[#eadfd4] bg-white/80 p-4">
                    <span className="shrink-0 text-lg font-bold text-[#c1846c]">{i + 1}</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={product.image_url} alt={product.title} loading="lazy" className="h-20 w-20 shrink-0 rounded-[14px] object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900">{product.title}</p>
                      {product.price_text && <p className="text-sm text-[#df7b59] font-semibold">{product.price_text}</p>}
                      {product.short_note && <p className="mt-1 text-sm text-slate-500">{product.short_note}</p>}
                      {outboundUrl && (
                        <a href={outboundUrl} target="_blank" rel="noopener noreferrer nofollow sponsored" className="mt-1 inline-block text-sm font-semibold text-[#df7b59] hover:underline">
                          View this gift →
                        </a>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
          );
        })()}

        <div className="mt-10 space-y-8">
          {post.sections.map((section) => (
            <div key={section.heading}>
              <h2 className="text-xl font-semibold text-slate-900">{section.heading}</h2>
              <p className="mt-3 text-[16px] leading-7 text-slate-600">{section.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-[24px] border border-[#eadfd4] bg-white/80 p-6 text-center sm:p-8">
          <p className="text-[15px] text-slate-600">Ready to actually find something?</p>
          <Link
            href={post.shopLink}
            className="mt-4 inline-flex h-12 items-center justify-center rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] px-7 text-sm font-semibold text-white shadow-lg"
          >
            {post.shopLinkLabel}
          </Link>
        </div>

        {relatedPosts.length > 0 && (
          <div className="mt-12">
            <h2 className="text-lg font-semibold text-slate-900">You might also want</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {relatedPosts.map((related) => (
                <Link
                  key={related.slug}
                  href={`/blog/${related.slug}`}
                  className="block rounded-[18px] border border-[#eadfd4] bg-white/80 p-4 text-sm font-semibold text-slate-700 transition hover:border-[#f0c9b5] hover:text-[#df7b59]"
                >
                  {related.title}
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>
    </PublicShell>
  );
}
