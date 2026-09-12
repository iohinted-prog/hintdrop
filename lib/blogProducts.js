import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { normalizeProductRow } from "@/lib/products";

// Same lists as GiftShopClient.jsx's OCCASION_OPTIONS/RELATIONSHIP_
// OPTIONS - duplicated rather than imported since that's a "use
// client" component and this needs to run server-side at build time.
// Small, stable lists; if one changes there, mirror it here too.
const OCCASION_OPTIONS = [
  "Birthday", "Christmas", "Anniversary", "Valentine's Day", "Mother's Day",
  "Father's Day", "Thank you", "New baby", "Housewarming", "Wedding",
  "Graduation", "Just because",
];
const RELATIONSHIP_OPTIONS = [
  "Partner", "Boyfriend", "Girlfriend", "Husband", "Wife", "Father", "Mother", "Parent",
  "Brother", "Sister", "Sibling", "Son", "Daughter", "Child", "Friend", "Colleague", "Family", "For him", "For her",
];

function slugify(label) {
  return label.toLowerCase().replace(/'/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function optionFromSlug(options, slug) {
  if (!slug) return "";
  const normalized = slugify(slug);
  return options.find((opt) => slugify(opt) === normalized) || "";
}

// Reads a post's own shopLink (e.g. "/gift-shop?occasion=fathers-day")
// and resolves it back to the real tag value ("Father's Day") to
// query on - every post already encodes this in the link it already
// has, so there's no separate field to keep in sync by hand across
// 24+ posts.
export function filtersFromShopLink(shopLink) {
  if (!shopLink) return {};
  const query = shopLink.split("?")[1] || "";
  const params = new URLSearchParams(query);
  const occasion = optionFromSlug(OCCASION_OPTIONS, params.get("occasion"));
  const relationship = optionFromSlug(RELATIONSHIP_OPTIONS, params.get("relationship"));
  return { occasion, relationship };
}

// Pulls real, live products for a blog listicle ("Top 20 gifts for
// X") rather than inventing placeholder items - the same shop_products
// table and normalizeProductRow the actual shop API route
// (app/api/products/route.js) uses, just queried directly here since
// this runs server-side at build time (generateStaticParams'd blog
// posts), not from a client component making an HTTP round trip to
// its own app.
//
// Defaults to the uk region - a blog post is statically generated
// once, with no per-visitor request context (cookie-based region) to
// read at build time, unlike the live shop page. Good enough for a
// representative "top gifts" list; the actual shopLink each post
// links out to still correctly region-detects for whoever clicks it.
export async function getTopProductsFor({ occasion, relationship, limit = 20, region = "uk" }) {
  try {
    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("shop_products")
      .select("*")
      .eq("is_active", true)
      .eq("region", region);

    if (occasion) query = query.contains("occasion_tags", [occasion]);
    if (relationship) query = query.contains("relationship_tags", [relationship]);

    const { data, error } = await query
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data.map(normalizeProductRow).filter((p) => p.image_url);
  } catch {
    // A blog post failing to render its product list shouldn't ever
    // take the whole page down - falls back to an empty list, and the
    // template below just skips rendering that section.
    return [];
  }
}
