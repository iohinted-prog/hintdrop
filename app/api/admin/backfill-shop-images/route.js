import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const HTML_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-GB,en;q=0.9",
};

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

async function scrapeImage(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8500);
  try {
    const res = await fetch(url, { headers: HTML_HEADERS, redirect: "follow", signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const $ = cheerio.load(html);
    const image =
      $('meta[property="og:image"]').attr("content") ||
      $('meta[name="twitter:image"]').attr("content") ||
      "";
    if (image.startsWith("//")) return "https:" + image;
    return image;
  } finally {
    clearTimeout(timeout);
  }
}

// One-off maintenance endpoint — requires a secret to run, since it writes
// to the database. Processes a batch at a time (default 15) to stay safely
// within Vercel's function timeout — call repeatedly until "remaining" is 0.
// Delete or leave dormant once the backfill is fully done.
export async function POST(req) {
  const { secret, limit } = await req.json().catch(() => ({}));
  if (!secret || secret !== process.env.ADMIN_BACKFILL_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const batchSize = Math.min(Number(limit) || 1, 2);

  const supabase = getSupabase();
  const { data: products, error } = await supabase
    .from("shop_products")
    .select("id, product_url")
    .eq("network", "manual")
    .or("image_url.is.null,image_url.eq.")
    .limit(batchSize);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results = { updated: 0, failed: [] };

  for (const product of products || []) {
    try {
      const image = await scrapeImage(product.product_url);
      if (image) {
        await supabase.from("shop_products").update({ image_url: image }).eq("id", product.id);
        results.updated += 1;
      } else {
        results.failed.push({ id: product.id, reason: "no og:image found" });
      }
    } catch (err) {
      results.failed.push({ id: product.id, reason: err?.message || "fetch failed" });
    }
  }

  const { count: remaining } = await supabase
    .from("shop_products")
    .select("id", { count: "exact", head: true })
    .eq("network", "manual")
    .or("image_url.is.null,image_url.eq.");

  return NextResponse.json({ ...results, remaining: remaining || 0 });
}
