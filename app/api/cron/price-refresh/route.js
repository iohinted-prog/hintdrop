import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getProductPreview } from "@/lib/linkPreview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Worst case per item: 3.5s HTML-attempt timeout + 5s LinkPreview.net
// fallback timeout + 0.6s inter-item delay ≈ 9.1s. At batch size 6 that's
// ~54.6s worst case, safely under 60s (Vercel's ceiling on both Hobby and
// Pro). Sized this way deliberately after the exact 504 timeout saga the
// image backfill route went through — same lesson applied up front here
// instead of relearning it.
export const maxDuration = 60;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Same transient-vs-permanent distinction as the image backfill route.
const TRANSIENT_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);
// A confirmed-gone page (product genuinely removed/discontinued) —
// deactivate immediately rather than waiting out the retry budget.
const GONE_STATUSES = new Set([404, 410]);

const MAX_ATTEMPTS = 5;
// Worst case per item now: 9.1s (as before) + up to ~9s for the OCR
// text-in-image check (lib/textDetection.js, added later — checks run
// concurrently across an item's own image candidates, so the added
// cost is one slowest-check's worth, not a sum) ≈ 18.1s. Lowered from
// 6 to 3 to keep real headroom under the 60s ceiling: 3 × 18.1s ≈
// 54.3s. Even that leaves less margin than ideal, so lowered further
// to 2 for real safety: 2 × 18.1s ≈ 36.2s, ~24s of headroom.
const BATCH_SIZE = 2;
// A "deal": current price at or below 90% of its trailing 30-day average.
const DEAL_LOOKBACK_DAYS = 30;
const DEAL_THRESHOLD = 0.9;

// Scheduled via vercel.json (Vercel Cron sends this bearer token
// automatically when CRON_SECRET is set) — same auth pattern as the
// existing app/api/cron/reminders route. Processes one batch per
// invocation; relies on the cron's own recurring schedule to eventually
// cover the whole catalog, rather than looping internally like the
// manually-triggered image backfill script does.
export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();
  const { data: products, error } = await supabase
    .from("shop_products")
    .select("id, product_url, currency, price_check_attempts")
    .eq("is_active", true)
    // Oldest-checked-first (never-checked sorts first under ascending +
    // nullsFirst) so every product gets a fair, rotating turn instead of
    // the same handful winning every batch — the exact ordering bug
    // fixed on the image backfill route, applied here from the start.
    .order("last_price_check_at", { ascending: true, nullsFirst: true })
    .limit(BATCH_SIZE);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results = { updated: 0, onSale: 0, deactivated: 0, failed: [] };

  for (const product of products || []) {
    const attemptsSoFar = product.price_check_attempts || 0;
    const nowIso = new Date().toISOString();

    try {
      const preview = await getProductPreview(product.product_url, product.currency || "GBP");

      if (preview.blocked || preview.numericPrice == null) {
        const status = preview.debug?.status;
        const nextAttempts = attemptsSoFar + 1;

        if (GONE_STATUSES.has(status)) {
          await supabase.from("shop_products").update({
            is_active: false,
            last_price_check_at: nowIso,
          }).eq("id", product.id);
          results.deactivated += 1;
          results.failed.push({ id: product.id, reason: `page gone (status ${status})` });
        } else if (nextAttempts >= MAX_ATTEMPTS) {
          await supabase.from("shop_products").update({
            is_active: false,
            price_check_attempts: nextAttempts,
            last_price_check_at: nowIso,
          }).eq("id", product.id);
          results.deactivated += 1;
          results.failed.push({ id: product.id, reason: `gave up after ${nextAttempts} attempts` });
        } else {
          await supabase.from("shop_products").update({
            price_check_attempts: nextAttempts,
            last_price_check_at: nowIso,
          }).eq("id", product.id);
          results.failed.push({ id: product.id, reason: "no price found this attempt", attempts: nextAttempts });
        }
      } else {
        // Got a real price. Compare against trailing history (before
        // this check) to decide the on_sale flag, then record it.
        const { data: history } = await supabase
          .from("price_history")
          .select("price")
          .eq("product_id", product.id)
          .gte("checked_at", new Date(Date.now() - DEAL_LOOKBACK_DAYS * 86400000).toISOString());

        const priorPrices = (history || []).map((h) => Number(h.price)).filter(Number.isFinite);
        const trailingAvg = priorPrices.length
          ? priorPrices.reduce((a, b) => a + b, 0) / priorPrices.length
          : null;
        // No prior history yet (first check ever) — not enough data to
        // call it a deal either way, just record the baseline.
        const onSale = trailingAvg != null && preview.numericPrice <= trailingAvg * DEAL_THRESHOLD;

        const { error: historyError } = await supabase.from("price_history").insert({
          product_id: product.id,
          price: preview.numericPrice,
          currency: preview.detectedCurrency || product.currency || "GBP",
        });
        // Was previously unchecked — if this insert silently failed (e.g.
        // a missing grant, or Supabase's PostgREST schema cache not yet
        // reflecting a recent ALTER TABLE), numeric_price would still
        // update correctly below since that's a separate call, masking
        // the failure entirely. Throwing here instead surfaces it
        // properly in results.failed rather than swallowing it.
        if (historyError) throw new Error(`price_history insert failed: ${historyError.message}`);

        await supabase.from("shop_products").update({
          numeric_price: preview.numericPrice,
          price_text: preview.priceText || null,
          on_sale: onSale,
          price_check_attempts: 0,
          last_price_check_at: nowIso,
        }).eq("id", product.id);

        results.updated += 1;
        if (onSale) results.onSale += 1;
      }
    } catch (err) {
      const reason = err?.message || "fetch failed";
      const isTransient = TRANSIENT_STATUSES.has(err?.status) || reason.includes("429") || reason.includes("aborted");
      const nextAttempts = attemptsSoFar + 1;
      const permanentlyStuck = nextAttempts >= MAX_ATTEMPTS;

      if (!isTransient || permanentlyStuck) {
        await supabase.from("shop_products").update({
          is_active: false,
          price_check_attempts: nextAttempts,
          last_price_check_at: nowIso,
        }).eq("id", product.id);
        results.deactivated += 1;
      } else {
        await supabase.from("shop_products").update({
          price_check_attempts: nextAttempts,
          last_price_check_at: nowIso,
        }).eq("id", product.id);
      }
      results.failed.push({ id: product.id, reason, retryable: isTransient && !permanentlyStuck, attempts: nextAttempts });
    }

    await new Promise((r) => setTimeout(r, 600));
  }

  const { count: remaining } = await supabase
    .from("shop_products")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);

  return NextResponse.json({ ...results, activeTotal: remaining || 0 });
}
