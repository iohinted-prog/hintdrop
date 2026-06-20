import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REQUEST_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-GB,en;q=0.9",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
};

function decodeHtml(value = "") {
  return String(value)
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(value = "") {
  return String(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function cleanText(value = "") {
  return decodeHtml(stripTags(String(value))).trim();
}

function ensureHttpUrl(rawUrl = "") {
  const trimmed = String(rawUrl).trim();
  if (!trimmed) return "";

  const withProtocol =
    trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    if (!["http:", "https:"].includes(parsed.protocol)) return "";
    return parsed.toString();
  } catch {
    return "";
  }
}

function makeAbsoluteUrl(value = "", base = "") {
  if (!value) return "";
  try {
    return new URL(value, base).toString();
  } catch {
    return "";
  }
}

function getHostnameLabel(url = "") {
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return "";
  }
}

function stripAmazonParams(url = "") {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url;
  }
}

function safeJsonParse(value = "") {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function getMeta($, selectors = []) {
  for (const selector of selectors) {
    const value = $(selector).attr("content");
    const cleaned = cleanText(value || "");
    if (cleaned) return cleaned;
  }
  return "";
}

function getAttr($, selectors = [], attr = "content") {
  for (const selector of selectors) {
    const value = $(selector).attr(attr);
    const cleaned = String(value || "").trim();
    if (cleaned) return cleaned;
  }
  return "";
}

function getText($, selectors = []) {
  for (const selector of selectors) {
    const value = $(selector).first().text();
    const cleaned = cleanText(value || "");
    if (cleaned) return cleaned;
  }
  return "";
}

function extractCanonical($, fallbackUrl) {
  const canonical =
    getAttr($, ['link[rel="canonical"]'], "href") ||
    getMeta($, ['meta[property="og:url"]', 'meta[name="og:url"]']);

  return makeAbsoluteUrl(canonical, fallbackUrl) || fallbackUrl;
}

function cleanAmazonTitle(title = "") {
  return String(title)
    .replace(/\s*:\s*Amazon\.[A-Za-z.]+.*$/i, "")
    .replace(/\s*\|\s*Amazon\.[A-Za-z.]+.*$/i, "")
    .replace(/\s*-\s*Amazon\.[A-Za-z.]+.*$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function extractTitle($, canonicalUrl) {
  const hostname = getHostnameLabel(canonicalUrl);

  let title =
    getText($, ["#productTitle", "h1"]) ||
    getMeta($, [
      'meta[property="og:title"]',
      'meta[name="og:title"]',
      'meta[name="twitter:title"]',
      'meta[name="title"]',
    ]) ||
    getText($, ["title"]) ||
    hostname;

  if (hostname.includes("amazon.")) {
    title = cleanAmazonTitle(title);
  }

  return title || hostname || "Shared item";
}

function extractDescription($, canonicalUrl) {
  const hostname = getHostnameLabel(canonicalUrl);

  let description =
    getMeta($, [
      'meta[property="og:description"]',
      'meta[name="og:description"]',
      'meta[name="twitter:description"]',
      'meta[name="description"]',
    ]) ||
    getText($, [
      "#feature-bullets",
      "#bookDescription_feature_div",
      "#productDescription",
      "main p",
    ]) ||
    "";

  if (hostname.includes("amazon.") && /^amazon$/i.test(description)) {
    description = "";
  }

  return description;
}

function currencySymbolFromCode(code = "") {
  const upper = String(code).toUpperCase();
  if (upper === "GBP") return "£";
  if (upper === "USD") return "$";
  if (upper === "EUR") return "€";
  if (upper === "AUD") return "A$";
  if (upper === "NZD") return "NZ$";
  if (upper === "CAD") return "C$";
  if (upper === "ZAR") return "R";
  return "";
}

function normalisePriceNumber(value = "") {
  const cleaned = String(value).replace(/,/g, "").trim();
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed) || parsed <= 0) return "";
  return parsed % 1 === 0 ? String(parsed) : parsed.toFixed(2).replace(/\.00$/, "");
}

function formatPrice(value = "", currency = "") {
  const amount = normalisePriceNumber(value);
  if (!amount) return "";
  const symbol = currencySymbolFromCode(currency);
  return symbol ? `${symbol}${amount}` : amount;
}

function extractNumericPrice(value = "") {
  const cleaned = String(value).replace(/,/g, "");
  const match =
    cleaned.match(/(?:£|\$|€|A\$|NZ\$|C\$|R)\s?(\d+(?:\.\d{1,2})?)/) ||
    cleaned.match(/(\d+(?:\.\d{1,2})?)/);

  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function shortenTitle(title = "", retailer = "") {
  const source = String(title || "").trim();
  if (!source) return "Saved hint";

  const cleanRetailer = String(retailer || "")
    .replace(/^www\./i, "")
    .replace(/\.(co\.uk|com|co|net|org)$/i, "")
    .trim()
    .toLowerCase();

  const stopWords = new Set([
    "the",
    "and",
    "with",
    "for",
    "from",
    "new",
    "latest",
    "edition",
    "model",
    "official",
    "amazon",
    "uk",
    "black",
    "white",
    "silver",
    "blue",
    "green",
    "pink",
    "grey",
    "gray",
    "wireless",
    "bluetooth",
  ]);

  const categoryWords = [
    "headphones",
    "earbuds",
    "speaker",
    "kindle",
    "book",
    "pillowcase",
    "pillowcases",
    "dish",
    "pan",
    "mug",
    "print",
    "necklace",
    "ring",
    "bag",
    "dress",
    "trainer",
    "trainers",
    "jacket",
    "candle",
    "coffee",
    "set",
    "workshop",
    "experience",
    "voucher",
    "lego",
    "camera",
    "watch",
    "sofa",
    "blanket",
    "coat",
    "boots",
    "sandals",
    "lamp",
    "vase",
    "frame",
  ];

  let cleaned = source
    .replace(/\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/[|:;,/]/g, " ")
    .replace(/\b[A-Z0-9-]{6,}\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  let words = cleaned.split(" ").filter(Boolean);

  words = words.filter((word) => {
    const lower = word.toLowerCase();
    if (stopWords.has(lower)) return false;
    if (lower === cleanRetailer) return false;
    if (/^\d+$/.test(lower)) return false;
    return true;
  });

  if (words.length === 0) return "Saved hint";

  const brand = words[0];
  const foundCategory = words.find((word) =>
    categoryWords.includes(word.toLowerCase())
  );

  if (foundCategory && brand.toLowerCase() !== foundCategory.toLowerCase()) {
    return [brand, foundCategory]
      .join(" ")
      .trim()
      .replace(/^./, (m) => m.toUpperCase());
  }

  return words
    .slice(0, Math.min(words.length >= 2 ? 2 : 1, 2))
    .join(" ")
    .trim()
    .replace(/^./, (m) => m.toUpperCase());
}

function extractPriceFromMeta($) {
  const directPrice =
    getMeta($, [
      'meta[property="product:price:amount"]',
      'meta[name="product:price:amount"]',
      'meta[property="og:price:amount"]',
      'meta[name="og:price:amount"]',
      'meta[property="twitter:data1"]',
      'meta[name="twitter:data1"]',
    ]) || "";

  const currency =
    getMeta($, [
      'meta[property="product:price:currency"]',
      'meta[name="product:price:currency"]',
      'meta[property="og:price:currency"]',
      'meta[name="og:price:currency"]',
    ]) || "GBP";

  if (!directPrice) return "";
  return formatPrice(directPrice, currency);
}

function pickPriceFromOffer(offer) {
  if (!offer || typeof offer !== "object") return "";

  if (offer.price) return formatPrice(offer.price, offer.priceCurrency);

  if (offer.priceSpecification && typeof offer.priceSpecification === "object") {
    const spec = offer.priceSpecification;
    if (spec.price) {
      return formatPrice(spec.price, spec.priceCurrency || offer.priceCurrency);
    }
    if (spec.minPrice) {
      return formatPrice(spec.minPrice, spec.priceCurrency || offer.priceCurrency);
    }
  }

  if (offer.lowPrice) return formatPrice(offer.lowPrice, offer.priceCurrency);
  return "";
}

function collectImages(value, baseUrl = "") {
  if (!value) return [];
  const values = Array.isArray(value) ? value : [value];

  return values
    .map((item) => {
      if (typeof item === "string") return makeAbsoluteUrl(item, baseUrl);
      if (item?.url) return makeAbsoluteUrl(item.url, baseUrl);
      return "";
    })
    .filter(Boolean);
}

function findProductDataInJsonLd(node, baseUrl = "") {
  const result = {
    title: "",
    brand: "",
    priceText: "",
    images: [],
  };

  function visit(value) {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (typeof value !== "object") return;

    const typeValue = Array.isArray(value["@type"])
      ? value["@type"].join(" ")
      : String(value["@type"] || "");
    const lowerType = typeValue.toLowerCase();

    if (!result.title && (lowerType.includes("product") || lowerType.includes("offer"))) {
      result.title = cleanText(value.name || result.title || "");
    }

    if (!result.brand && value.brand) {
      if (typeof value.brand === "string") result.brand = cleanText(value.brand);
      if (typeof value.brand === "object") result.brand = cleanText(value.brand.name || "");
    }

    if (!result.priceText) {
      if (value.offers) {
        const offers = Array.isArray(value.offers) ? value.offers : [value.offers];
        for (const offer of offers) {
          const found = pickPriceFromOffer(offer);
          if (found) {
            result.priceText = found;
            break;
          }
        }
      } else if (value.price) {
        const direct = formatPrice(value.price, value.priceCurrency);
        if (direct) result.priceText = direct;
      }
    }

    const foundImages = collectImages(value.image, baseUrl);
    if (foundImages.length) result.images.push(...foundImages);

    if (value["@graph"]) visit(value["@graph"]);

    Object.values(value).forEach((child) => {
      if (child && typeof child === "object") visit(child);
    });
  }

  visit(node);

  return {
    title: result.title,
    brand: result.brand,
    priceText: result.priceText,
    images: [...new Set(result.images)],
  };
}

function extractJsonLdProductData($, baseUrl = "") {
  const scripts = $('script[type="application/ld+json"]');
  let best = { title: "", brand: "", priceText: "", images: [] };

  for (let i = 0; i < scripts.length; i += 1) {
    const raw = $(scripts[i]).contents().text();
    if (!raw) continue;

    const parsed = safeJsonParse(raw);
    if (!parsed) continue;

    const found = findProductDataInJsonLd(parsed, baseUrl);

    if (!best.title && found.title) best.title = found.title;
    if (!best.brand && found.brand) best.brand = found.brand;
    if (!best.priceText && found.priceText) best.priceText = found.priceText;
    if (found.images.length) best.images.push(...found.images);
  }

  best.images = [...new Set(best.images)];
  return best;
}

function extractPriceFromText($) {
  const textCandidates = [
    getText($, [".priceToPay .a-offscreen"]),
    getText($, [".a-price .a-offscreen"]),
    getText($, ["[data-testid='price']"]),
    getText($, [".price"]),
    getText($, ["main"]),
  ].filter(Boolean);

  for (const text of textCandidates) {
    const match = String(text).match(/(?:£|\$|€|A\$|NZ\$|C\$|R)\s?\d+(?:[.,]\d{1,2})?/);
    if (match?.[0]) return match[0].replace(",", "");
  }

  return "";
}

function improveAmazonImage(url = "") {
  return String(url)
    .replace(/\._AC_[A-Z0-9,]+_\./i, "._AC_SL1500_.")
    .replace(/\._SL\d+_\./i, "._SL1500_.")
    .replace(/\._SX\d+_\./i, "._SL1500_.")
    .replace(/\._SY\d+_\./i, "._SL1500_.");
}

function looksLikeBadImage(url = "") {
  return /logo|sprite|icon|favicon|avatar|placeholder|spacer|loading|1x1|blank|transparent/i.test(
    url
  );
}

function scoreImage(url = "", hostname = "", source = "") {
  let score = 0;
  const lower = url.toLowerCase();

  if (!url) return -100;
  if (looksLikeBadImage(url)) score -= 90;
  if (/\b(product|products|prod)\b/i.test(lower)) score += 20;
  if (/\bhero|primary|main|large\b/i.test(lower)) score += 16;
  if (/\.(jpg|jpeg|png|webp|avif)(\?|$)/i.test(lower)) score += 12;
  if (hostname && lower.includes(hostname.replace(/^www\./, ""))) score += 6;
  if (source === "jsonld") score += 25;
  if (source === "og") score += 18;
  if (source === "dom") score += 8;
  if (/1500|1200|1024|960|800/.test(lower)) score += 8;
  if (/data:image\//.test(lower)) score -= 100;

  return score;
}

function dedupeCandidates(candidates = []) {
  const seen = new Set();
  const output = [];

  for (const candidate of candidates) {
    if (!candidate?.url) continue;
    if (seen.has(candidate.url)) continue;
    seen.add(candidate.url);
    output.push(candidate);
  }

  return output;
}

function buildImageCandidates($, baseUrl, canonicalUrl, jsonLdImages = []) {
  const hostname = getHostnameLabel(canonicalUrl);
  const candidates = [];

  const addCandidate = (url, source) => {
    const absolute = makeAbsoluteUrl(url, baseUrl);
    if (!absolute) return;

    const improved = hostname.includes("amazon.") ? improveAmazonImage(absolute) : absolute;

    candidates.push({
      url: improved,
      source,
      score: scoreImage(improved, hostname, source),
    });
  };

  jsonLdImages.forEach((url) => addCandidate(url, "jsonld"));

  [
    getAttr($, ["#landingImage", "#imgBlkFront", "#ebooksImgBlkFront"], "src"),
    getAttr($, ["#landingImage", "#imgBlkFront", "#ebooksImgBlkFront"], "data-old-hires"),
    getMeta($, [
      'meta[property="og:image"]',
      'meta[property="og:image:url"]',
      'meta[name="og:image"]',
      'meta[name="twitter:image"]',
      'meta[name="twitter:image:src"]',
    ]),
    getAttr($, ['link[rel="image_src"]'], "href"),
  ]
    .filter(Boolean)
    .forEach((url) => addCandidate(url, "og"));

  $("img").each((_, element) => {
    const attrs = [
      $(element).attr("src"),
      $(element).attr("data-src"),
      $(element).attr("data-old-hires"),
      $(element).attr("data-lazy-src"),
      $(element).attr("data-image"),
    ].filter(Boolean);

    for (const src of attrs) {
      if (!src) continue;

      if (String(src).startsWith("{")) {
        try {
          const parsed = JSON.parse(String(src));
          Object.keys(parsed).forEach((imageUrl) => addCandidate(imageUrl, "dom"));
        } catch {}
      } else {
        addCandidate(String(src), "dom");
      }
    }
  });

  return dedupeCandidates(candidates)
    .filter((candidate) => candidate.score > -20)
    .sort((a, b) => b.score - a.score);
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

async function fetchHtml(inputUrl) {
  const response = await fetch(inputUrl, {
    method: "GET",
    headers: REQUEST_HEADERS,
    redirect: "follow",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Unable to fetch link (${response.status}).`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) {
    throw new Error("That URL did not return an HTML page.");
  }

  const html = await response.text();
  if (!html || !html.trim()) {
    throw new Error("The page returned an empty response.");
  }

  return {
    html,
    finalUrl: response.url || inputUrl,
  };
}

async function fetchPreview(inputUrl) {
  const { html, finalUrl } = await fetchHtml(inputUrl);
  const $ = cheerio.load(html);

  let canonicalUrl = extractCanonical($, finalUrl);
  if (getHostnameLabel(canonicalUrl).includes("amazon.")) {
    canonicalUrl = stripAmazonParams(canonicalUrl);
  }

  const jsonLd = extractJsonLdProductData($, finalUrl);
  const title = jsonLd.title || extractTitle($, canonicalUrl);
  const description = extractDescription($, canonicalUrl);
  const siteName = extractSiteName($, canonicalUrl);
  const priceText =
    jsonLd.priceText || extractPriceFromMeta($) || extractPriceFromText($) || "";

  const imageCandidates = buildImageCandidates(
    $,
    finalUrl,
    canonicalUrl,
    jsonLd.images
  );

  const selectedImage = imageCandidates[0]?.url || "";
  const titleShort = shortenTitle(title, siteName);

  const hasStrongImage = Boolean(selectedImage);
  const hasPrice = Boolean(priceText);
  const hasTitle = Boolean(title);

  const confidence =
    hasStrongImage && hasTitle && hasPrice
      ? "high"
      : hasTitle && (hasStrongImage || hasPrice)
      ? "medium"
      : "low";

  return {
    url: canonicalUrl,
    title: title || "Shared item",
    titleShort,
    description: description || "",
    siteName: siteName || getHostnameLabel(canonicalUrl),
    image: selectedImage,
    selectedImage,
    imageCandidates: imageCandidates.slice(0, 8),
    priceText: priceText || "",
    numericPrice: extractNumericPrice(priceText || ""),
    confidence,
    needsReview: confidence !== "high",
    source: "scraper",
    brand: jsonLd.brand || "",
    debug: {
      finalUrl,
      canonicalUrl,
      hostname: getHostnameLabel(canonicalUrl),
      imageCandidateCount: imageCandidates.length,
      topImageCandidate: imageCandidates[0] || null,
      hasJsonLdImage: jsonLd.images.length > 0,
      hasPriceFromJsonLd: Boolean(jsonLd.priceText),
    },
  };
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    const inputUrl = ensureHttpUrl(body?.url || "");

    if (!inputUrl) {
      return NextResponse.json(
        { error: "Please provide a valid URL." },
        { status: 400 }
      );
    }

    const result = await fetchPreview(inputUrl);
    return NextResponse.json(result);
  } catch (error) {
    console.error("link-preview route error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch preview." },
      { status: 500 }
    );
  }
}
