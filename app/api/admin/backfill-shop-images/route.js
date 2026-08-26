import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Was 30s. Per-item worst case (3s same-domain wait + up to 8.5s
// LinkPreview timeout + 0.6s delay) is ~12.1s, so even the old batch
// cap of 6 could take up to ~72.6s — comfortably over 30s, which is
// almost certainly what was causing the 504s. Raised to 60s (Vercel's
// ceiling on both Hobby and Pro as of writing) and paired with a lower
// batch cap below so the true worst case now fits with real headroom.
export const maxDuration = 60;

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
  // Lowered from 6 — even 6 was still capable of exceeding the (now 60s)
  // function timeout in the worst case: 3s same-domain wait + up to 8.5s
  // LinkPreview timeout + 0.6s delay ≈ 12.1s per item, so 6 items could
  // reach ~72.6s. Capped at 4 instead: 4 × 12.1s ≈ 48.4s, leaving ~12s of
  // real headroom under the 60s limit even in the worst case.
  const batchSize = Math.min(Number(limit) || 4, 4);
  const MAX_ATTEMPTS = 5;

  const supabase = getSupabase();
  const { data: products, error } = await supabase
    .from("shop_products")
    .select("id, product_url, backfill_attempts")
    .eq("network", "manual")
    .or("image_url.is.null,image_url.eq.")
    .is("raw_payload", null)
    // No ordering meant the same handful of persistently-stuck items
    // (Sonos, Urban Outfitters — domain-level blocks that never clear,
    // not a real rate limit) sat at the head of every batch and kept
    // getting retried ahead of untried items. Since run_backfill.sh
    // counts a batch as a stall if ANY item in it is retryable, those
    // few items were poisoning almost every batch and tripping the
    // 5-stall give-up fast, even while plenty of healthy items sat
    // untouched behind them. Ordering by fewest attempts first means
    // never-tried items get priority; already-failing items only get
    // their turn once nothing better is available, still accumulating
    // toward their 5-attempt cap and eventual auto-deactivation.
    .order("backfill_attempts", { ascending: true })
    .limit(batchSize);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results = { updated: 0, failed: [] };

  // Sonos and Urban Outfitters items all failed with 425/429 — rate-limit
  // shaped codes — and retrying didn't help, which points at a domain-
  // level rate limit rather than a one-off blip. The query has no ORDER
  // BY, so items from the same retailer can end up processed back-to-back
  // in the same batch; a flat inter-request delay doesn't account for
  // that. Waiting noticeably longer specifically when two consecutive
  // items share a domain gives that domain's rate limit more room to
  // reset, without slowing down the common case of unrelated domains.
  let lastDomain = null;
  for (const product of products || []) {
    const attemptsSoFar = product.backfill_attempts || 0;
    const domain = (() => { try { return new URL(product.product_url).hostname; } catch { return null; } })();
    if (domain && domain === lastDomain) {
      await new Promise((r) => setTimeout(r, 3000));
    }
    lastDomain = domain;

    try {
      const image = await scrapeImage(product.product_url);
      if (image) {
        await supabase.from("shop_products").update({ image_url: image }).eq("id", product.id);
        results.updated += 1;
      } else {
        // No permanent-failure path was ever wired to is_active — a
        // product with no og:image tag at all would sit here indefinitely,
        // visible on the shop page showing the gradient placeholder,
        // exactly like the batch that needed a manual cleanup. Deactivate
        // immediately rather than waiting for that to happen again.
        await supabase.from("shop_products").update({ raw_payload: { backfill_failed: "no og:image found" }, is_active: false }).eq("id", product.id);
        results.failed.push({ id: product.id, reason: "no og:image found" });
      }
    } catch (err) {
      const reason = err?.message || "fetch failed";
      const isTransient = TRANSIENT_STATUSES.has(err?.status) || reason.includes("429") || reason.includes("aborted");
      const nextAttempts = attemptsSoFar + 1;
      // A "transient" failure normally stays eligible for retry rather than
      // being permanently marked as failed — but if the SAME item keeps
      // failing attempt after attempt, that's not really transient in
      // practice, it's a persistently broken URL. Without this cap, a
      // handful of permanently-425ing items sit at the head of the query
      // forever (no ORDER BY, so the same rows keep coming back first) and
      // block every healthy item behind them from ever being reached.
      const permanentlyStuck = nextAttempts >= MAX_ATTEMPTS;
      if (!isTransient || permanentlyStuck) {
        // Same reasoning as the no-og:image case above — once a product
        // is confirmed permanently unfixable (whether that's an
        // immediate non-transient error like a 403, or exhausting every
        // retry), deactivate it right then rather than leaving it
        // active-but-imageless until someone happens to notice and
        // cleans it up manually.
        await supabase.from("shop_products").update({
          raw_payload: { backfill_failed: permanentlyStuck ? `${reason} (gave up after ${nextAttempts} attempts)` : reason },
          backfill_attempts: nextAttempts,
          is_active: false,
        }).eq("id", product.id);
      } else {
        await supabase.from("shop_products").update({ backfill_attempts: nextAttempts }).eq("id", product.id);
      }
      results.failed.push({ id: product.id, reason, retryable: isTransient && !permanentlyStuck, attempts: nextAttempts });
    }
    await new Promise((r) => setTimeout(r, 600));
  }

  const { count: remaining } = await supabase
    .from("shop_products")
    .select("id", { count: "exact", head: true })
    .eq("network", "manual")
    .or("image_url.is.null,image_url.eq.")
    .is("raw_payload", null);

  return NextResponse.json({ ...results, remaining: remaining || 0 });
}
