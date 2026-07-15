import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { normalizeProductRow, errorToMessage } from "@/lib/products";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("shop_products")
      .select("*")
      .eq("is_active", true)
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
