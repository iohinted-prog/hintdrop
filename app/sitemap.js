import { getSupabaseAdmin } from "@/lib/supabase/admin";

const STATIC_ENTRIES = [
  {
    url: "https://hintdrop.app",
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 1.0,
  },
  {
    url: "https://hintdrop.app/about",
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    url: "https://hintdrop.app/gift-shop-uk",
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.9,
  },
  {
    url: "https://hintdrop.app/gift-shop-us",
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.9,
  },
  {
    url: "https://hintdrop.app/for-brands",
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    url: "https://hintdrop.app/extension",
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.6,
  },
  {
    url: "https://hintdrop.app/contact",
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.5,
  },
  {
    url: "https://hintdrop.app/terms",
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.3,
  },
  {
    url: "https://hintdrop.app/privacy",
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.3,
  },
];

// One combined sitemap works fine at current catalog size (low
// thousands of products, well under the 50,000-URL-per-sitemap
// limit) - worth splitting into a sitemap index (per-region files via
// generateSitemaps()) once the catalog is meaningfully larger than
// that, but not before.
async function getProductEntries() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("shop_products")
      .select("id, region, updated_at, created_at")
      .eq("is_active", true);

    if (error) throw error;
    if (!Array.isArray(data)) return [];

    return data
      .filter((row) => (row.region === "uk" || row.region === "us") && row.id)
      .map((row) => ({
        url: `https://hintdrop.app/gift-shop-${row.region}/p/${row.id}`,
        lastModified: row.updated_at ? new Date(row.updated_at) : row.created_at ? new Date(row.created_at) : new Date(),
        changeFrequency: "weekly",
        priority: 0.6,
      }));
  } catch (err) {
    // A sitemap that's missing today's new products is far better
    // than a sitemap route that throws and takes the static entries
    // down with it.
    console.error("sitemap product fetch failed:", err.message);
    return [];
  }
}

export default async function sitemap() {
  const productEntries = await getProductEntries();
  return [...STATIC_ENTRIES, ...productEntries];
}
