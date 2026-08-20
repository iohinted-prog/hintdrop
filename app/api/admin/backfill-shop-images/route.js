import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

async function scrapeImage(url) {
  const apiKey = process.env.LINKPREVIEW_API_KEY;
  if (!apiKey) throw new Error("Missing LINKPREVIEW_API_KEY");

  const apiUrl = new URL("https://api.linkpreview.net/");
  apiUrl.searchParams.set("q", url);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8500);
  try {
    const res = await fetch(apiUrl.toString(), {
      method: "GET",
      headers: { Accept: "application/json", "X-Linkpreview-Api-Key": apiKey },
      signal: controller.signal,
    });
    const raw = await res.text();
    let data = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      throw new Error("LinkPreview returned invalid JSON");
    }
    if (!res.ok) {
      const err = new Error(data?.error || data?.message || `LinkPreview failed with status ${res.status}`);
      err.status = res.status;
      throw err;
    }
    let image = String(data?.image || "").trim();
    if (image.startsWith("//")) image = "https:" + image;
    // John Lewis's Scene7-based image CDN needs fmt=auto to actually
    // return a usable image — LinkPreview.net's URL omits it
    if (image.includes("media.johnlewiscontent.com") && image.includes("?$")) {
      const idx = image.indexOf("?$");
      image = image.slice(0, idx) + "?fmt=auto&$background-off-white$&" + image.slice(idx + 1);
    }
    return image;
  } finally {
    clearTimeout(timeout);
  }
}

// Statuses that indicate a transient/rate-limit condition on LinkPreview's
// side rather than a genuine, permanent problem with the target URL. These
// should be retried later, never permanently marked as failed.
const TRANSIENT_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

// One-off maintenance endpoint — requires a secret to run, since it writes
// to the database. Uses the same LinkPreview.net service the Hints feature
// itself relies on, rather than a raw fetch, so it isn't blocked by
// retailer bot-protection. Processes a batch at a time to stay safely
// within Vercel's function timeout — call repeatedly until "remaining" is 0.
// Delete or leave dormant once the backfill is fully done.
export async function POST(req) {
  const { secret, limit } = await req.json().catch(() => ({}));
  if (!secret || secret !== process.env.ADMIN_BACKFILL_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const batchSize = Math.min(Number(limit) || 8, 10);

  const supabase = getSupabase();
  const { data: products, error } = await supabase
    .from("shop_products")
    .select("id, product_url")
    .eq("network", "manual")
    .or("image_url.is.null,image_url.eq.")
    .is("raw_payload", null)
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
        await supabase.from("shop_products").update({ raw_payload: { backfill_failed: "no og:image found" } }).eq("id", product.id);
        results.failed.push({ id: product.id, reason: "no og:image found" });
      }
    } catch (err) {
      const reason = err?.message || "fetch failed";
      const isTransient = TRANSIENT_STATUSES.has(err?.status) || reason.includes("429") || reason.includes("aborted");
      // Transient failures (rate limits, gateway hiccups, timeouts) aren't
      // permanently marked as failed, so they stay eligible for retry on
      // the next call — only a genuine, stable failure (bad URL, no image
      // found, etc.) gets written to raw_payload and excluded going forward
      if (!isTransient) {
        await supabase.from("shop_products").update({ raw_payload: { backfill_failed: reason } }).eq("id", product.id);
      }
      results.failed.push({ id: product.id, reason, retryable: isTransient });
    }
    await new Promise((r) => setTimeout(r, 400));
  }

  const { count: remaining } = await supabase
    .from("shop_products")
    .select("id", { count: "exact", head: true })
    .eq("network", "manual")
    .or("image_url.is.null,image_url.eq.")
    .is("raw_payload", null);

  return NextResponse.json({ ...results, remaining: remaining || 0 });
}
