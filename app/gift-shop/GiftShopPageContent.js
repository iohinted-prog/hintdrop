import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { normalizeProductRow } from "@/lib/products";
import GiftShopClient from "./GiftShopClient";

// The actual interactive shop (filters, search, share buttons, all of
// it) lives entirely in GiftShopClient.jsx, untouched from before -
// deliberately not modified here, to avoid any risk of regressing a
// working, tested feature. That file is a "use client" component, so
// none of its content exists in the initial HTML response until
// JavaScript runs - a crawler that doesn't execute JS sees an empty
// shell.
//
// This server component fetches a real sample of products directly
// and renders them inside a <noscript> block - genuine content,
// visible in the raw HTML to anything that doesn't run JavaScript,
// but never rendered by any real browser with JS enabled (a standard,
// well-defined HTML mechanism, not a hidden-via-CSS trick - this is
// not cloaking, since real users get the exact same or richer content
// via the interactive client component that replaces it).
async function getSampleProducts(region) {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("shop_products")
      .select("*")
      .eq("is_active", true)
      .eq("region", region)
      .order("created_at", { ascending: false })
      .limit(24);

    if (error) throw error;
    return Array.isArray(data) ? data.map(normalizeProductRow) : [];
  } catch (err) {
    // Never let this block the real page from loading - the <noscript>
    // sample is a bonus for crawlers, not something a real visitor's
    // experience should ever depend on.
    console.error("gift-shop sample fetch failed:", err.message);
    return [];
  }
}

// Shared by app/gift-shop-uk/page.js and app/gift-shop-us/page.js -
// each just calls this with its fixed region, the same way
// app/shop-uk and app/shop-us both render <ShopPageContent> with a
// fixed region prop. app/gift-shop/page.js is the un-suffixed
// "auto detect on arrival" entry point (mirroring /shop), and
// redirects to one of these two via proxy.js rather than rendering
// this directly.
export default async function GiftShopPage({ region }) {
  const sampleProducts = await getSampleProducts(region);

  return (
    <>
      <noscript>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "32px 20px" }}>
          <h1>Gift Shop | HintDrop</h1>
          <p>Curated gifts for everyone. Save your favourites as hints on HintDrop.</p>
          <ul style={{ listStyle: "none", padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20 }}>
            {sampleProducts.map((product) => (
              <li key={product.id}>
                <a href={`/gift-shop-${region}/p/${product.id}`}>
                  {product.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.image_url} alt={product.title || "Gift idea"} style={{ width: "100%", height: 180, objectFit: "cover" }} />
                  ) : null}
                  <p style={{ fontWeight: 600 }}>{product.title || "Gift idea"}</p>
                </a>
                {product.retailer ? <p>{product.retailer}</p> : null}
                {product.price_text ? <p>{product.price_text}</p> : null}
              </li>
            ))}
          </ul>
        </div>
      </noscript>
      <GiftShopClient region={region} />
    </>
  );
}
