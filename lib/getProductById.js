import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { normalizeProductRow } from "@/lib/products";

// Fetches one product by id, scoped to a region and active status -
// scoping by region means a UK product id can never resolve on the
// US pages (and vice versa), keeping /gift-shop-uk/p/[id] and
// /gift-shop-us/p/[id] cleanly separate catalogs even though ids are
// globally unique in the table.
export async function getProductById(region, id) {
  if (!id) return null;

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("shop_products")
      .select("*")
      .eq("id", id)
      .eq("region", region)
      .eq("is_active", true)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return normalizeProductRow(data);
  } catch (err) {
    console.error("getProductById failed:", err.message);
    return null;
  }
}
