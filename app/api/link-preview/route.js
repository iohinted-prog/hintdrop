import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

function decodeHtml(value = "") {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#x2F;/gi, "/")
    .replace(/&#47;/gi, "/")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(value = "") {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function cleanText(value = "") {
  return decodeHtml(stripTags(String(value))).trim();
}

function makeAbsoluteUrl(value, base) {
  if (!value) return "";
  try {
    return new URL(value, base).toString();
  } catch {
    return "";
  }
}

function getHostnameLabel(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function ensureHttpUrl(rawUrl = "") {
  const trimmed = rawUrl.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `https://${trimmed}`;
}

function getMeta($, selectors = []) {
  for (const selector of selectors) {
    const value = $(selector).attr("content");
    if (value) {
      const cleaned = cleanText(value);
      if (cleaned) return cleaned;
    }
  }
  return "";
}

function getLinkHref($, selectors = []) {
  for (const selector of selectors) {
    const value = $(selector).attr("href");
    if (value) {
      const cleaned = cleanText(value);
      if (cleaned) return cleaned;
    }
  }
  return "";
}

function extractCanonical($, fallbackUrl) {
  const canonical =
    getLinkHref($, ['link[rel="canonical"]']) ||
    getMeta($, ['meta[property="og:url"]', 'meta[name="og:url"]']);

  return makeAbsoluteUrl(canonical, fallbackUrl) || fallbackUrl;
}

function extractTitle($, fallbackUrl) {
  return (
    getMeta($, [
      'meta[property="og:title"]',
      'meta[name="og:title"]',
      'meta[name="twitter:title"]',
      'meta[name="title"]',
    ]) ||
    cleanText($("title").first().text()) ||
    getHostnameLabel(fallbackUrl)
  );
}

function extractDescription($) {
  return getMeta($, [
    'meta[property="og:description"]',
    'meta[name="og:description"]',
    'meta[name="twitter:description"]',
    'meta[name="description"]',
  ]);
}

function extractImage($, baseUrl) {
  const image =
    getMeta($, [
      'meta[property="og:image"]',
      'meta[property="og:image:url"]',
      'meta[name="og:image"]',
      'meta[name="twitter:image"]',
      'meta[name="twitter:image:src"]',
    ]) || "";

  return makeAbsoluteUrl(image, baseUrl);
}

function extractSiteName($, canonicalUrl) {
  return (
    getMeta($, [
      'meta[property="og:site_name"]',
      'meta[name="og:site_name"]',
      'meta[name="twitter:site"]',
      'meta[name="application-name"]',
    ]) || getHostnameLabel(canonicalUrl)
  );
}

function currencySymbolFromCode(code = "") {
  const upper = code.toUpperCase();
  if (upper === "GBP") return "£";
  if (upper === "USD") return "$";
  if (upper === "EUR") return "€";
  return upper ? `${upper} ` : "";
}

function formatPrice(value, currency = "") {
  const cleaned = String(value || "").replace(/,/g, "").trim();
  if (!cleaned) return "";
  const symbol = currencySymbolFromCode(currency);
  if (symbol && !cleaned.startsWith(symbol)) return `${symbol}${cleaned}`;
  return cleaned;
}

function extractPriceFromMeta($) {
  const directPrice =
    getMeta($, [
      'meta[property="product:price:amount"]',
      'meta[name="product:price:amount"]',
      'meta[property="og:price:amount"]',
      'meta[name="og:price:amount"]',
      'meta[property="twitter:data1"]',
    ]) || "";

  const currency =
    getMeta($, [
      'meta[property="product:price:currency"]',
      'meta[name="product:price:currency"]',
      'meta[property="og:price:currency"]',
      'meta[name="og:price:currency"]',
    ]) || "GBP";

  if (directPrice) {
    return formatPrice(directPrice, currency);
  }

  return "";
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function pickPriceFromOffer(offer) {
  if (!offer || typeof offer !== "object") return "";

  const directPrice = offer.price;
  const directCurrency = offer.priceCurrency;

  if (directPrice) {
    return formatPrice(directPrice, directCurrency);
  }

  if (offer.priceSpecification && typeof offer.priceSpecification === "object") {
    const spec = offer.priceSpecification;
    if (spec.price) {
      return formatPrice(spec.price, spec.priceCurrency || directCurrency);
    }
    if (spec.minPrice) {
      return formatPrice(spec.minPrice, spec.priceCurrency || directCurrency);
    }
  }

  if (offer.lowPrice) {
    return formatPrice(offer.lowPrice, offer.priceCurrency || directCurrency);
  }

  return "";
}

function findPriceInJsonLdNode(node) {
  if (!node) return "";

  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findPriceInJsonLdNode(item);
      if (found) return found;
    }
    return "";
  }

  if (typeof node !== "object") return "";

  if (node.offers) {
    const offers = Array.isArray(node.offers) ? node.offers : [node.offers];
    for (const offer of offers) {
      const found = pickPriceFromOffer(offer);
      if (found) return found;
    }
  }

  if (node["@graph"]) {
    const found = findPriceInJsonLdNode(node["@graph"]);
    if (found) return found;
  }

  if (node.price) {
    return formatPrice(node.price, node.priceCurrency);
  }

  if (node.priceSpecification) {
    const found = pickPriceFromOffer({
      priceSpecification: node.priceSpecification,
      priceCurrency: node.priceCurrency,
    });
    if (found) return found;
  }

  for (const value of Object.values(node)) {
    if (typeof value === "object") {
      const found = findPriceInJsonLdNode(value);
      if (found) return found;
    }
  }

  return "";
}

function extractPriceFromJsonLd($) {
  const scripts = $('script[type="application/ld+json"]');

  for (let i = 0; i < scripts.length; i += 1) {
    const raw = $(scripts[i]).contents().text();
    if (!raw) continue;

    const parsed = safeJsonParse(raw);
    if (!parsed) continue;

    const found = findPriceInJsonLdNode(parsed);
    if (found) return found;
  }

  return "";
}

function extractPriceFromHtml(html) {
  const patterns = [
    /£\s?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?/i,
    /\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?/i,
    /€\s?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[0]) {
      return match[0].replace(/\s+/g, "");
    }
  }

  return "";
}

function extractPrice($, html) {
  return extractPriceFromMeta($) || extractPriceFromJsonLd($) || extractPriceFromHtml(html) || "";
}

export async function POST(request) {
  try {
    const body = await request.json();
    const rawUrl = body?.url || "";
    const targetUrl = ensureHttpUrl(rawUrl);

    if (!targetUrl) {
      return NextResponse.json({ error: "Missing URL" }, { status: 400 });
    }

    let parsedTarget;
    try {
      parsedTarget = new URL(targetUrl);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const response = await fetch(parsedTarget.toString(), {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; HintedLinkPreviewBot/1.0; +https://hinted.io)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Could not fetch that URL" }, { status: 400 });
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      return NextResponse.json(
        { error: "That URL did not return an HTML page" },
        { status: 400 }
      );
    }

    const finalUrl = response.url || parsedTarget.toString();
    const html = await response.text();
    const $ = cheerio.load(html);

    const canonical = extractCanonical($, finalUrl);
    const title = extractTitle($, canonical);
    const description = extractDescription($);
    const image = extractImage($, canonical);
    const siteName = extractSiteName($, canonical);
    const price = extractPrice($, html);

    return NextResponse.json({
      url: canonical,
      title,
      description,
      siteName,
      image,
      price,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to build preview" },
      { status: 500 }
    );
  }
}
