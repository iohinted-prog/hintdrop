// One-off script to populate shop_products with real, scraped product data.
//
// Usage:
//   1. Fill in PRODUCT_URLS below with real retailer product URLs.
//   2. Run: node scripts/seed-shop-products.mjs
//
// Requires these env vars to be set (same ones used elsewhere in the app):
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   SITE_URL (your deployed site, e.g. https://hintdrop.app) — used to call
//     the existing /api/link-preview scraper so results match hints exactly.

import { createClient } from "@supabase/supabase-js";

// --- 1. Add real product URLs here ---
const PRODUCT_URLS = [
  // "https://www.johnlewis.com/some-product/p12345",
  // "https://www.currys.co.uk/products/some-product-123.html",
];

// --- 2. Optional: tag hints per URL (index-matched to PRODUCT_URLS) ---
// Leave empty arrays if you don't want to tag anything yet.
const TAGS = {
  // "https://www.johnlewis.com/some-product/p12345": { interest_tags: ["Home"], occasion_tags: ["Housewarming"] },
};

const SITE_URL = process.env.SITE_URL || "https://hintdrop.app";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function scrapeProduct(url) {
  const res = await fetch(`${SITE_URL}/api/link-preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, currency: "GBP" }),
  });

  if (!res.ok) {
    throw new Error(`Scrape failed (${res.status}) for ${url}`);
  }

  return res.json();
}

async function main() {
  if (!PRODUCT_URLS.length) {
    console.log("No URLs in PRODUCT_URLS — add some real product links first, then re-run.");
    return;
  }

  const rows = [];

  for (const url of PRODUCT_URLS) {
    console.log(`Scraping: ${url}`);

    let preview;
    try {
      preview = await scrapeProduct(url);
    } catch (err) {
      console.error(`  ✗ ${err.message}`);
      continue;
    }

    if (!preview.title || !preview.image) {
      console.warn(`  ⚠ Incomplete data (needsReview: ${preview.needsReview}) — skipping. Title: "${preview.title}", Image: ${preview.image ? "yes" : "missing"}`);
      continue;
    }

    const tagInfo = TAGS[url] || {};

    rows.push({
      title: preview.title,
      retailer: preview.siteName,
      price_text: preview.priceText || null,
      numeric_price: preview.numericPrice,
      currency: preview.detectedCurrency || "GBP",
      image_url: preview.image,
      product_url: preview.url,
      affiliate_url: "", // fill in manually if you have affiliate links set up
      interest_tags: tagInfo.interest_tags || [],
      occasion_tags: tagInfo.occasion_tags || [],
      is_active: true,
      network: "impact",
    });

    console.log(`  ✓ "${preview.title}" — ${preview.priceText || "no price"}`);
  }

  if (!rows.length) {
    console.log("Nothing usable to insert.");
    return;
  }

  const { data, error } = await supabase.from("shop_products").insert(rows).select("id, title");

  if (error) {
    console.error("Insert failed:", error.message);
    process.exit(1);
  }

  console.log(`\nInserted ${data.length} product(s):`);
  data.forEach((row) => console.log(`  - ${row.title} (${row.id})`));
}

main();
