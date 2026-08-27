import { NextResponse } from "next/server";
import { getProductPreview } from "@/lib/linkPreview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Thin wrapper — all the actual scraping logic (HTML-first, LinkPreview.net
// fallback, blocked-retailer list, price/currency detection) now lives in
// lib/linkPreview.js, shared with app/api/cron/price-refresh/route.js so
// both features use the exact same scraping behavior rather than two
// separately-maintained copies.
export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    const result = await getProductPreview(body?.url, body?.currency);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || "Unexpected error." },
      { status: err?.status && err.status < 500 ? err.status : 500 }
    );
  }
}
