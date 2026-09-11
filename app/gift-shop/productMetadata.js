import { getProductById } from "@/lib/getProductById";

// Real search-facing copy per product, rather than a generic shop
// title repeated across a thousand pages - the whole point of these
// pages existing. Builds a description like:
// "Onda Large Glass Vase from Nordstrom - $110. A gift idea for
// Housewarming, Wedding - Friend, Family."
function buildDescription(product) {
  const parts = [];

  if (product.title) parts.push(product.title);
  if (product.retailer) parts.push(`from ${product.retailer}`);

  const lead = parts.join(" ");
  const price = product.price_text ? ` - ${product.price_text}.` : ".";

  const occasions = (product.occasion_tags || []).slice(0, 3).join(", ");
  const relationships = (product.relationship_tags || []).slice(0, 3).join(", ");

  let tail = "";
  if (occasions && relationships) {
    tail = ` A gift idea for ${occasions} - ${relationships}.`;
  } else if (occasions) {
    tail = ` A gift idea for ${occasions}.`;
  } else if (relationships) {
    tail = ` A gift idea for ${relationships}.`;
  }

  return `${lead}${price}${tail}`.trim();
}

export async function buildProductMetadata(region, id) {
  const product = await getProductById(region, id);

  if (!product) {
    return {
      title: "Gift idea not found",
      robots: { index: false, follow: true },
    };
  }

  const title = `${product.title}${product.price_text ? ` - ${product.price_text}` : ""}`;
  const description = buildDescription(product);
  const canonicalUrl = `https://hintdrop.app/gift-shop-${region}/p/${product.id}`;

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "HintDrop",
      type: "website",
      images: product.image_url ? [product.image_url] : ["https://hintdrop.app/og-default-v2.png"],
    },
  };
}

// Product structured data (schema.org/Product) - the actual lever for
// price/availability rich snippets in Google search results, separate
// from the openGraph/twitter tags above which only affect link
// previews. A second getProductById call here rather than threading
// the result through from generateMetadata - Next's fetch/data layer
// dedupes identical requests within the same render pass, and
// splitting these into two small, independently-named functions
// (matching the existing buildProductMetadata) reads more clearly
// than one function returning two unrelated shapes.
export async function buildProductJsonLd(region, id) {
  const product = await getProductById(region, id);
  if (!product) return null;

  const canonicalUrl = `https://hintdrop.app/gift-shop-${region}/p/${product.id}`;
  // in_stock is the only state this catalog actually tracks (is_active
  // already filters out anything that isn't) - no separate stock-level
  // signal to reflect a genuine "out of stock" state, so this is never
  // guessed at beyond what's true: every listed product is available.
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    image: product.image_url ? [product.image_url] : undefined,
    description: buildDescription(product),
    brand: product.retailer ? { "@type": "Brand", name: product.retailer } : undefined,
    url: canonicalUrl,
    offers: {
      "@type": "Offer",
      price: product.numeric_price || undefined,
      priceCurrency: product.currency || "GBP",
      availability: "https://schema.org/InStock",
      url: product.affiliate_url || product.product_url || canonicalUrl,
    },
  };
}
