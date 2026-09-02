import { NextResponse } from "next/server";
import { getProductPreview } from "@/lib/linkPreview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Was 30s. The OCR text-in-image check (lib/textDetection.js) can run
// against up to 4 image candidates concurrently, each with its own ~9s
// timeout — a slow-but-not-timed-out worst case could genuinely
// approach 30s on top of the scraping itself. Raised to 60s, the
// ceiling on both Vercel Hobby and Pro (same limit the shop backfill
// route already documented).
export const maxDuration = 60;

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
