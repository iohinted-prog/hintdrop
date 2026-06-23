export const ACTIVE_CURRENCY = "GBP";

export function errorToMessage(value) {
  if (!value) return "Something went wrong.";
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.message || "Something went wrong.";

  if (typeof value === "object") {
    if (typeof value.message === "string" && value.message.trim()) return value.message;
    if (typeof value.error === "string" && value.error.trim()) return value.error;
  }

  return String(value);
}

export function getTagArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);

  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

export function normaliseRetailer(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Saved link";
  }
}

export function detectCurrency(raw) {
  const text = String(raw || "").trim();
  if (!text) return null;
  if (text.includes("£")) return "GBP";
  if (text.includes("€")) return "EUR";
  if (text.includes("$") && !text.includes("A$") && !text.includes("C$") && !text.includes("NZ$")) {
    return "USD";
  }
  if (/A\$/i.test(text)) return "AUD";
  if (/NZ\$/i.test(text)) return "NZD";
  if (/C\$/i.test(text)) return "CAD";
  if (/R\s?\d/i.test(text)) return "ZAR";
  return null;
}

export function extractNumericPrice(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (!value) return null;

  const cleaned = String(value).replace(/,/g, "");
  const match = cleaned.match(/(\d+(\.\d{1,2})?)/);
  if (!match) return null;

  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatPriceLabel(price, rawPrice, currency = ACTIVE_CURRENCY) {
  if (rawPrice && typeof rawPrice === "string" && rawPrice.trim()) return rawPrice;
  if (price == null) return "Price unavailable";

  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      maximumFractionDigits: Number(price) % 1 === 0 ? 0 : 2,
    }).format(Number(price));
  } catch {
    return `£${Math.round(Number(price))}`;
  }
}

export function getOutboundUrl(product) {
  const affiliate = String(product?.affiliate_url || "").trim();
  const productUrl = String(product?.product_url || "").trim();
  return affiliate || productUrl || "";
}

export function normalizeProductRow(row) {
  const numericPrice =
    typeof row?.numeric_price === "number"
      ? row.numeric_price
      : extractNumericPrice(row?.price_text);

  return {
    id: row?.id || crypto.randomUUID(),
    title: row?.title?.trim() || "Gift idea",
    retailer: row?.retailer || normaliseRetailer(row?.product_url || row?.affiliate_url || ""),
    price_text: formatPriceLabel(
      numericPrice,
      row?.price_text,
      detectCurrency(row?.price_text) || row?.currency || ACTIVE_CURRENCY
    ),
    numeric_price: numericPrice,
    currency: row?.currency || detectCurrency(row?.price_text) || ACTIVE_CURRENCY,
    image_url: row?.image_url || "",
    product_url: row?.product_url || "",
    affiliate_url: row?.affiliate_url || "",
    interest_tags: getTagArray(row?.interest_tags),
    occasion_tags: getTagArray(row?.occasion_tags),
    short_note: row?.short_note || "",
    description: row?.description || "",
    is_active: row?.is_active !== false,
    network: row?.network || "impact",
    advertiser_id: row?.advertiser_id || null,
    campaign_id: row?.campaign_id || null,
    catalog_id: row?.catalog_id || null,
    raw_payload: row?.raw_payload || null,
    created_at: row?.created_at || null,
    updated_at: row?.updated_at || null,
  };
}

export function buildHintInsertPayload(product, userId) {
  const outboundUrl = getOutboundUrl(product);
  const parsedNumericPrice =
    typeof product?.numeric_price === "number"
      ? product.numeric_price
      : extractNumericPrice(product?.price_text);

  return {
    userid: userId,
    title: product?.title?.trim() || "Saved from shop",
    url: outboundUrl,
    imageurl: product?.image_url || "",
    retailer: product?.retailer || normaliseRetailer(outboundUrl),
    pricetext: formatPriceLabel(
      parsedNumericPrice,
      product?.price_text,
      detectCurrency(product?.price_text) || ACTIVE_CURRENCY
    ),
    numericprice: parsedNumericPrice,
    starred: false,
    isprivate: false,
    position: 0,
    source: "shop",
  };
}
