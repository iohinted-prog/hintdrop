import { notFound } from "next/navigation";
import Link from "next/link";
import { getProductById } from "@/lib/getProductById";
import ProductSaveButton from "@/app/components/ProductSaveButton";

const REGION_LABELS = { uk: "UK", us: "US" };

function getOutboundUrl(product) {
  const affiliate = String(product?.affiliate_url || "").trim();
  const productUrl = String(product?.product_url || "").trim();
  return affiliate || productUrl || "";
}

function buildProductJsonLd(product, canonicalUrl) {
  const json = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    sku: product.id,
    ...(product.image_url ? { image: [product.image_url] } : {}),
    ...(product.description || product.short_note
      ? { description: product.description || product.short_note }
      : {}),
    ...(product.retailer ? { brand: { "@type": "Brand", name: product.retailer } } : {}),
    offers: {
      "@type": "Offer",
      url: canonicalUrl,
      priceCurrency: product.currency,
      ...(typeof product.numeric_price === "number" ? { price: product.numeric_price } : {}),
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };

  return JSON.stringify(json);
}

function buildBreadcrumbJsonLd(product, region, canonicalUrl) {
  const shopUrl = `https://hintdrop.app/gift-shop-${region}`;

  const json = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://hintdrop.app" },
      { "@type": "ListItem", position: 2, name: "Gift Shop", item: shopUrl },
      { "@type": "ListItem", position: 3, name: product.title, item: canonicalUrl },
    ],
  };

  return JSON.stringify(json);
}

// Shared by app/gift-shop-uk/p/[id]/page.js and app/gift-shop-us/p/[id]/page.js -
// each just calls this with its fixed region and the id from params.
// Deliberately server-rendered top to bottom (not a client component
// fetching data on mount, the way the shop grid does) - the whole
// point of this page existing is that a crawler sees the real title,
// price, and description without running any JavaScript at all.
export default async function ProductPageContent({ region, id }) {
  const product = await getProductById(region, id);

  if (!product) notFound();

  const canonicalUrl = `https://hintdrop.app/gift-shop-${region}/p/${product.id}`;
  const outboundUrl = getOutboundUrl(product);
  const regionLabel = REGION_LABELS[region] || region.toUpperCase();
  const otherRegion = region === "uk" ? "us" : "uk";

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 20px 80px" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: buildProductJsonLd(product, canonicalUrl) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: buildBreadcrumbJsonLd(product, region, canonicalUrl) }}
      />

      <nav aria-label="Breadcrumb" className="mb-6 text-[13px] text-slate-500">
        <Link href="/" className="hover:text-[#e37b57]">Home</Link>
        <span className="mx-2">/</span>
        <Link href={`/gift-shop-${region}`} className="hover:text-[#e37b57]">Gift Shop {regionLabel}</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-700">{product.title}</span>
      </nav>

      <div className="grid gap-8 sm:grid-cols-2">
        <div className="overflow-hidden rounded-[24px] border border-[#f1dfd6] bg-white">
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image_url}
              alt={product.title}
              style={{ width: "100%", height: "auto", display: "block", objectFit: "cover" }}
            />
          ) : null}
        </div>

        <div>
          <h1 className="text-[28px] font-bold tracking-[-0.04em] text-slate-900 sm:text-[32px]">
            {product.title}
          </h1>

          {product.retailer ? (
            <p className="mt-2 text-[14px] text-slate-500">from {product.retailer}</p>
          ) : null}

          {product.price_text ? (
            <p className="mt-4 text-[26px] font-bold text-slate-900">{product.price_text}</p>
          ) : null}

          {product.description || product.short_note ? (
            <p className="mt-4 text-[15px] leading-7 text-slate-600">
              {product.description || product.short_note}
            </p>
          ) : null}

          {product.occasion_tags?.length || product.relationship_tags?.length || product.interest_tags?.length ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {[...(product.occasion_tags || []), ...(product.relationship_tags || []), ...(product.interest_tags || [])].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-[#fff4ee] px-3 py-1 text-[12px] font-semibold text-[#e37b57]"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {outboundUrl ? (
              <a
                href={outboundUrl}
                target="_blank"
                rel="nofollow sponsored noopener noreferrer"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-gradient-to-b from-[#ff966f] to-[#ff7e54] px-6 text-[14px] font-semibold text-white shadow-sm sm:w-auto"
              >
                View on {product.retailer || "retailer"}
              </a>
            ) : null}

            <ProductSaveButton />
          </div>

          <p className="mt-3 text-[12px] text-slate-400">
            This is an affiliate link. If you buy through it, HintDrop may earn a commission at no extra cost to you.
          </p>

          <p className="mt-6 text-[12px] text-slate-400">
            Shopping from {otherRegion === "us" ? "the US" : "the UK"}?{" "}
            <Link href={`/gift-shop-${otherRegion}`} className="underline hover:text-[#e37b57]">
              Browse the {otherRegion.toUpperCase()} gift shop instead
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
