import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const PRIMARY_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-GB,en;q=0.9,en-US;q=0.8",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  DNT: "1",
  "Upgrade-Insecure-Requests": "1",
};

const SECONDARY_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-GB,en;q=0.9",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
};

const PRICE_REGEX =
  /(?:A\$|NZ\$|C\$|£|\$|€|R)\s?\d[\d,]*(?:\.\d{1,2})?|\d[\d,]*(?:\.\d{1,2})?\s?(?:GBP|USD|EUR|AUD|NZD|CAD|ZAR)/gi;

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

function extractTitle($, canonicalUrl, bodyText = "") {
  const hostname = getHostnameLabel(canonicalUrl);

  let title =
    getMeta($, [
      'meta[property="og:title"]',
      'meta[name="og:title"]',
      'meta[name="twitter:title"]',
      'meta[name="title"]',
    ]) ||
    getText($, ["h1"]) ||
    getText($, ["title"]);

  if (!title && bodyText) {
    const firstLines = bodyText
      .split(/\n+/)
      .map((line) => cleanText(line))
      .filter(Boolean)
      .slice(0, 12);

    title =
      firstLines.find(
        (line) =>
          line.length >= 12 &&
          line.length <= 220 &&
          !/save|delivery|returns|finance|representative|apr|credit/i.test(line)
      ) || "";
  }

  if (hostname.includes("amazon.")) {
    title = cleanAmazonTitle(title);
  }

  return title || hostname || "Shared item";
}

function extractDescription($) {
  return (
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
      "article p",
    ]) ||
    ""
  );
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

function detectCurrency(value = "") {
  const text = String(value || "").trim();
  if (!text) return null;
  if (text.includes("£")) return "GBP";
  if (text.includes("A$")) return "AUD";
  if (text.includes("NZ$")) return "NZD";
  if (text.includes("C$")) return "CAD";
  if (text.includes("$")) return "USD";
  if (text.includes("€")) return "EUR";
  if (/\bR\s?\d/i.test(text) || /\bZAR\b/i.test(text)) return "ZAR";
  return null;
}

function normalisePriceNumber(value = "") {
  const cleaned = String(value).replace(/,/g, "").trim();
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed) || parsed <= 0) return "";
  return parsed % 1 === 0
    ? String(parsed)
    : parsed.toFixed(2).replace(/\.00$/, "");
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
    cleaned.match(/(?:A\$|NZ\$|C\$|£|\$|€|R)\s?(\d+(?:\.\d{1,2})?)/) ||
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
    "tv",
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

  if (!words.length) return "Saved hint";

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
    ]) || "";

  if (!directPrice) return "";
  return formatPrice(directPrice, currency || detectCurrency(directPrice) || "");
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
      return formatPrice(
        spec.minPrice,
        spec.priceCurrency || offer.priceCurrency
      );
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
      if (item && item.url) return makeAbsoluteUrl(item.url, baseUrl);
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

function scorePriceCandidate(text = "", context = "") {
  let score = 0;
  const combined = `${text} ${context}`.toLowerCase();

  if (!text) return -100;

  if (/£\s?\d|€\s?\d|\$\s?\d|a\$\s?\d|nz\$\s?\d|c\$\s?\d|\br\s?\d/i.test(text)) score += 40;
  if (/sale|now|price|our price|current price|buy|basket|bag|cart|found it cheaper/i.test(combined)) score += 18;
  if (/delivery|returns|warranty|support plan|installation|recycling/.test(combined)) score -= 10;
  if (/finance|monthly|per month|apr|credit|representative example|interest rate/.test(combined)) score -= 8;
  if (/was|save|rrp/.test(combined)) score -= 3;
  if (/item no|product code|sku|model/.test(combined)) score -= 6;

  const numeric = extractNumericPrice(text);
  if (numeric != null) {
    if (numeric >= 1 && numeric <= 25000) score += 12;
    if (numeric < 1) score -= 20;
  }

  return score;
}

function extractGenericTextPrice($, bodyText = "") {
  const candidates = [];
  const seen = new Set();

  const addCandidate = (rawText = "", context = "") => {
    const text = cleanText(rawText);
    if (!text) return;

    const matches = text.match(PRICE_REGEX) || [];
    for (const match of matches) {
      const value = cleanText(match);
      if (!value) continue;

      const key = `${value}__${context}`;
      if (seen.has(key)) continue;
      seen.add(key);

      candidates.push({
        value,
        score: scorePriceCandidate(value, context),
        context: cleanText(context).slice(0, 240),
      });
    }
  };

  const selectors = [
    "[itemprop='price']",
    "[data-price]",
    "[data-testid*='price']",
    "[class*='price']",
    "[id*='price']",
    "[aria-label*='price']",
    "h1",
    "main",
    "article",
    "section",
    "body",
  ];

  for (const selector of selectors) {
    $(selector).each((_, el) => {
      const text = cleanText($(el).text());
      const context = cleanText(
        [
          $(el).attr("aria-label") || "",
          $(el).attr("data-testid") || "",
          $(el).attr("class") || "",
          $(el).closest("section, article, div").first().text() || "",
        ].join(" ")
      );
      addCandidate(text, context);
    });
  }

  if (bodyText) {
    const lines = bodyText
      .split(/\n+/)
      .map((line) => cleanText(line))
      .filter(Boolean);

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const context = [lines[i - 1] || "", line, lines[i + 1] || "", lines[i + 2] || ""].join(" ");
      addCandidate(line, context);
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.value || "";
}

function improveAmazonImage(url = "") {
  return String(url)
    .replace(/\._AC_[A-Z0-9,]+_\./i, "._AC_SL1500_.")
    .replace(/\._SL\d+_\./i, "._SL1500_.")
    .replace(/\._SX\d+_\./i, "._SL1500_.")
    .replace(/\._SY\d+_\./i, "._SL1500_.");
}

function looksLikeBadImage(url = "", alt = "") {
  const text = `${url} ${alt}`.toLowerCase();
  return /logo|sprite|icon|favicon|avatar|placeholder|spacer|loading|1x1|blank|transparent|trustpilot|star-rating/i.test(
    text
  );
}

function scoreImage(url = "", hostname = "", source = "", alt = "") {
  let score = 0;
  const lower = url.toLowerCase();
  const altLower = String(alt || "").toLowerCase();

  if (!url) return -100;
  if (looksLikeBadImage(url, alt)) score -= 90;
  if (/\b(product|products|prod|pdp)\b/i.test(lower)) score += 20;
  if (/\bhero|primary|main|large\b/i.test(lower)) score += 16;
  if (/\.(jpg|jpeg|png|webp|avif)(\?|$)/i.test(lower)) score += 12;
  if (hostname && lower.includes(hostname.replace(/^www\./, ""))) score += 6;
  if (source === "jsonld") score += 25;
  if (source === "og") score += 18;
  if (source === "dom") score += 8;
  if (/1500|1200|1024|960|800|640/.test(lower)) score += 8;
  if (/data:image\//.test(lower)) score -= 100;
  if (/product|tv|samsung|camera|dress|shoe|bag|watch|sofa|lamp/i.test(altLower)) score += 10;

  return score;
}

function dedupeCandidates(candidates = []) {
  const seen = new Set();
  const output = [];

  for (const candidate of candidates) {
    if (!candidate || !candidate.url) continue;
    if (seen.has(candidate.url)) continue;
    seen.add(candidate.url);
    output.push(candidate);
  }

  return output;
}

function buildImageCandidates($, baseUrl, canonicalUrl, jsonLdImages = []) {
  const hostname = getHostnameLabel(canonicalUrl);
  const candidates = [];

  const addCandidate = (url, source, alt = "") => {
    const absolute = makeAbsoluteUrl(url, baseUrl);
    if (!absolute) return;

    const improved = hostname.includes("amazon.") ? improveAmazonImage(absolute) : absolute;

    candidates.push({
      url: improved,
      source,
      alt: cleanText(alt),
      score: scoreImage(improved, hostname, source, alt),
    });
  };

  jsonLdImages.forEach((url) => addCandidate(url, "jsonld"));

  [
    getMeta($, [
      'meta[property="og:image"]',
      'meta[property="og:image:url"]',
      'meta[name="og:image"]',
      'meta[name="twitter:image"]',
      'meta[name="twitter:image:src"]',
    ]),
    getAttr($, ['link[rel="image_src"]'], "href"),
    getAttr($, ["#landingImage", "#imgBlkFront", "#ebooksImgBlkFront"], "src"),
    getAttr($, ["#landingImage", "#imgBlkFront", "#ebooksImgBlkFront"], "data-old-hires"),
  ]
    .filter(Boolean)
    .forEach((url) => addCandidate(url, "og"));

  $("img").each((_, element) => {
    const srcset = $(element).attr("srcset");
    const firstSrcset = srcset ? srcset.split(",")[0].trim().split(" ")[0] : "";
    const alt = $(element).attr("alt") || "";

    const attrs = [
      $(element).attr("src"),
      $(element).attr("data-src"),
      $(element).attr("data-old-hires"),
      $(element).attr("data-lazy-src"),
      $(element).attr("data-image"),
      $(element).attr("data-zoom-image"),
      $(element).attr("data-test-image"),
      firstSrcset,
    ].filter(Boolean);

    for (const src of attrs) {
      if (String(src).startsWith("{")) {
        try {
          const parsed = JSON.parse(String(src));
          Object.keys(parsed).forEach((imageUrl) => addCandidate(imageUrl, "dom", alt));
        } catch {}
      } else {
        addCandidate(String(src), "dom", alt);
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

function choosePrice({ preferredCurrency, jsonLdPrice, metaPrice, textPrice }) {
  const candidates = [
    { value: jsonLdPrice, source: "jsonld" },
    { value: metaPrice, source: "meta" },
    { value: textPrice, source: "text" },
  ]
    .filter((item) => item.value)
    .map((item) => ({
      ...item,
      currency: detectCurrency(item.value),
      numeric: extractNumericPrice(item.value),
    }));

  if (!candidates.length) {
    return {
      priceText: "",
      detectedCurrency: null,
      matchedPreferredCurrency: false,
      source: "none",
      candidates: [],
    };
  }

  const filteredByCurrency = preferredCurrency
    ? candidates.filter((item) => item.currency === preferredCurrency)
    : candidates;

  const pool = filteredByCurrency.length ? filteredByCurrency : candidates;

  pool.sort((a, b) => {
    const aHasDecimals = /\.\d{2}\b/.test(a.value) ? 1 : 0;
    const bHasDecimals = /\.\d{2}\b/.test(b.value) ? 1 : 0;
    if (bHasDecimals !== aHasDecimals) return bHasDecimals - aHasDecimals;
    return 0;
  });

  const winner = pool[0];

  return {
    priceText: winner.value,
    detectedCurrency: winner.currency,
    matchedPreferredCurrency: Boolean(
      preferredCurrency && winner.currency === preferredCurrency
    ),
    source: winner.source,
    candidates,
  };
}

function buildFallbackPreview(url, reason = "preview_unavailable") {
  const hostname = getHostnameLabel(url) || "Saved link";
  return {
    url,
    title: hostname,
    titleShort: hostname,
    description: "",
    siteName: hostname,
    image: "",
    selectedImage: "",
    imageCandidates: [],
    priceText: "",
    numericPrice: null,
    detectedCurrency: null,
    confidence: "low",
    needsReview: true,
    source: "fallback",
    brand: "",
    warning: reason,
    debug: {
      hostname,
      fallback: true,
      reason,
    },
  };
}

async function fetchWithTimeout(inputUrl, headers, timeoutMs = 12000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(inputUrl, {
      method: "GET",
      headers,
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
    });

    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchHtml(inputUrl) {
  const attempts = [
    { headers: PRIMARY_HEADERS, label: "primary" },
    { headers: SECONDARY_HEADERS, label: "secondary" },
  ];

  const errors = [];

  for (const attempt of attempts) {
    try {
      const response = await fetchWithTimeout(inputUrl, attempt.headers, 12000);

      if (!response.ok) {
        errors.push({
          attempt: attempt.label,
          message: `HTTP ${response.status}`,
        });
        continue;
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
        fetchDebug: {
          attempt: attempt.label,
          contentType,
          status: response.status,
        },
      };
    } catch (error) {
      const message =
        error && error.name === "AbortError"
          ? "Timed out"
          : error && error.message
          ? error.message
          : "Fetch failed";

      errors.push({
        attempt: attempt.label,
        message,
      });
    }
  }

  const error = new Error("Failed to fetch preview from remote site.");
  error.fetchErrors = errors;
  throw error;
}

async function fetchPreview(inputUrl, preferredCurrency = "GBP") {
  const { html, finalUrl, fetchDebug } = await fetchHtml(inputUrl);
  const $ = cheerio.load(html);

  let canonicalUrl = extractCanonical($, finalUrl);
  const hostname = getHostnameLabel(canonicalUrl);

  if (hostname.includes("amazon.")) {
    canonicalUrl = stripAmazonParams(canonicalUrl);
  }

  const rawBodyText = $("body").text() || "";
  const bodyText = cleanText(rawBodyText);

  const jsonLd = extractJsonLdProductData($, finalUrl);

  const title =
    jsonLd.title ||
    extractTitle($, canonicalUrl, rawBodyText) ||
    getHostnameLabel(canonicalUrl);

  const description = extractDescription($);
  const siteName = extractSiteName($, canonicalUrl);

  const jsonLdPrice = jsonLd.priceText || "";
  const metaPrice = extractPriceFromMeta($) || "";
  const textPrice = extractGenericTextPrice($, rawBodyText) || "";

  const chosenPrice = choosePrice({
    preferredCurrency,
    jsonLdPrice,
    metaPrice,
    textPrice,
  });

  const imageCandidates = buildImageCandidates($, finalUrl, canonicalUrl, jsonLd.images);
  const selectedImage = imageCandidates[0] ? imageCandidates[0].url : "";
  const titleShort = shortenTitle(title, siteName);

  const hasStrongImage = Boolean(selectedImage);
  const hasPrice = Boolean(chosenPrice.priceText);
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
    priceText: chosenPrice.priceText || "",
    numericPrice: extractNumericPrice(chosenPrice.priceText || ""),
    detectedCurrency: chosenPrice.detectedCurrency,
    confidence,
    needsReview: confidence !== "high",
    source: "scraper",
    brand: jsonLd.brand || "",
    debug: {
      finalUrl,
      canonicalUrl,
      hostname: getHostnameLabel(canonicalUrl),
      preferredCurrency,
      selectedPriceSource: chosenPrice.source,
      selectedPriceText: chosenPrice.priceText || "",
      matchedPreferredCurrency: chosenPrice.matchedPreferredCurrency,
      jsonLdTitle: jsonLd.title || "",
      extractedTitle: title || "",
      jsonLdPrice,
      metaPrice,
      textPrice,
      allPriceCandidates: chosenPrice.candidates,
      imageCandidateCount: imageCandidates.length,
      topImageCandidate: imageCandidates[0] || null,
      hasJsonLdImage: jsonLd.images.length > 0,
      bodySnippet: bodyText.slice(0, 2500),
      fetchDebug,
    },
  };
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    const inputUrl = ensureHttpUrl(body?.url || "");
    const preferredCurrency = String(body?.currency || "GBP").toUpperCase();

    if (!inputUrl) {
      return NextResponse.json(
        { error: "Please provide a valid URL." },
        { status: 400 }
      );
    }

    try {
      const result = await fetchPreview(inputUrl, preferredCurrency);
      return NextResponse.json(result, { status: 200 });
    } catch (previewError) {
      const fallback = buildFallbackPreview(inputUrl, "fetch_failed");
      fallback.debug.fetchErrors = previewError?.fetchErrors || [];
      fallback.debug.message =
        previewError?.message || "Failed to fetch preview.";
      fallback.debug.preferredCurrency = preferredCurrency;

      return NextResponse.json(fallback, { status: 200 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch preview." },
      { status: 500 }
    );
  }
}
