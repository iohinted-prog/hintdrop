import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { normalizeProductRow, errorToMessage } from "@/lib/products";

export async function GET(req) {
  try {
    const supabase = getSupabaseAdmin();
    // Defaults to uk rather than requiring every caller to pass one -
    // matches the site's existing default market, and keeps this a
    // non-breaking change for anything still calling this route
    // without a region param.
    const region = req.nextUrl.searchParams.get("region") || "uk";

    const { data, error } = await supabase
      .from("shop_products")
      .select("*")
      .eq("is_active", true)
      .eq("region", region)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(
      { products: Array.isArray(data) ? data.map(normalizeProductRow) : [] },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: errorToMessage(error), products: [] },
      { status: 500 }
    );
  }
}
