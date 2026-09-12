import Link from "next/link";
import { notFound } from "next/navigation";
import PublicShell from "../../components/PublicShell";
import { BLOG_POSTS, getBlogPost } from "../../../lib/blogPosts";

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
      </article>
    </PublicShell>
  );
}
