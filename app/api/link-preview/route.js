import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const HTML_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-GB,en;q=0.9",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
};

const PRICE_REGEX =
  /(?:A\$|NZ\$|C\$|£|\$|€)\s?\d[\d,]*(?:\.\d{1,2})?|\b\d[\d,]*(?:\.\d{1,2})?\s?(?:GBP|USD|EUR|AUD|NZD|CAD)\b/gi;

const BLOCK_WORDS = [
  "access denied",
  "blocked",
  "captcha",
  "robot check",
  "verify you are human",
  "security check",
  "service unavailable",
  "unusual traffic",
  "automated access",
  "enable cookies",
  "cloudflare",
  "please enable js",
];

function cleanText(value = "") {
  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function ensureHttpUrl(raw = "") {
  const trimmed = String(raw).trim();
  if (!trimmed) return "";

  const withProtocol =
    trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.toString() : "";
  } catch {
    return "";
  }
}

function cleanCanonicalUrl(inputUrl = "") {
  try {
    const url = new URL(inputUrl);
    url.hash = "";
    return url.toString();
  } catch {
    return inputUrl;
  }
}

function makeAbsolute(url = "", base = "") {
  if (!url) return "";
  try {
    return new URL(url, base).toString();
  } catch {
    return "";
  }
}

function hostname(url = "") {
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return "";
  }
}

function detectCurrency(val = "") {
  if (!val) return null;
  if (val.includes("£")) return "GBP";
  if (val.includes("A$")) return "AUD";
  if (val.includes("NZ$")) return "NZD";
  if (val.includes("C$")) return "CAD";
  if (val.includes("$")) return "USD";
  if (val.includes("€")) return "EUR";
  return null;
}

function extractNumericPrice(val = "") {
  const cleaned = String(val).replace(/,/g, "");
  const match =
    cleaned.match(/(?:A\$|NZ\$|C\$|£|\$|€)\s?(\d+(?:\.\d{1,2})?)/) ||
    cleaned.match(/(\d+(?:\.\d{1,2})?)/);

  if (!match) return null;
  const num = Number(match[1]);
  return Number.isFinite(num) ? num : null;
}

function includesBlockedText(value = "") {
  const text = String(value).toLowerCase();
  return BLOCK_WORDS.some((word) => text.includes(word));
}

function getMeta($, selectors = []) {
  for (const sel of selectors) {
    const val = cleanText($(sel).attr("content") || "");
    if (val) return val;
  }
  return "";
}

function getText($, selectors = []) {
  for (const sel of selectors) {
    const val = cleanText($(sel).first().text() || "");
    if (val) return val;
  }
  return "";
}

function getAttrValue($, selectors = [], attr = "content") {
  for (const sel of selectors) {
    const val = String($(sel).first().attr(attr) || "").trim();
    if (val) return val;
  }
  return "";
}

function getImage($, base = "") {
  const candidates = [
    getMeta($, ['meta[property="og:image"]', 'meta[name="twitter:image"]']),
    getAttrValue($, ['link[rel="image_src"]'], "href"),
    getAttrValue($, ["img[src]"], "src"),
  ].filter(Boolean);

  for (const candidate of candidates) {
    const abs = makeAbsolute(candidate, base);
    if (abs) return abs;
  }

  return "";
}

function extractDomPrice($) {
  const selectors = [
    '[itemprop="price"]',
    'meta[property="product:price:amount"]',
    'meta[property="og:price:amount"]',
    '[data-testid*="price"]',
    '[class*="price"]',
    '[id*="price"]',
  ];

  for (const sel of selectors) {
    const el = $(sel).first();
    if (!el.length) continue;

    const val =
      cleanText(el.attr("content") || "") ||
      cleanText(el.attr("value") || "") ||
      cleanText(el.text() || "");

    if (!val) continue;

    const match = val.match(PRICE_REGEX);
    if (match && match[0]) return cleanText(match[0]);
  }

  const bodyText = cleanText($("body").text() || "");
  const bodyMatch = bodyText.match(PRICE_REGEX);
  return bodyMatch && bodyMatch[0] ? cleanText(bodyMatch[0]) : "";
}

function buildManualReviewResponse(inputUrl = "", message = "") {
  const safeUrl = cleanCanonicalUrl(inputUrl);
  const host = hostname(safeUrl);

  return {
    url: safeUrl,
    title: "",
    titleShort: "",
    description: message || "Please fill out this hint manually.",
    siteName: host,
    image: "",
    selectedImage: "",
    imageCandidates: [],
    priceText: "",
    numericPrice: null,
    detectedCurrency: null,
    brand: "",
    confidence: "low",
    needsReview: true,
    blocked: false,
    blockReason: "manual-review",
    blockMessage: message || "Manual review required.",
    source: "fallback",
    debug: {
      hostname: host,
      fallback: "manual-review",
      error: message || "",
    },
  };
}

function isUsablePreview(result) {
  if (!result || result.blocked) return false;

  const hasTitle = Boolean(result.title && result.title !== "Shared item");
  const hasImage = Boolean(result.image);
  const hasPrice = Boolean(result.priceText);

  return (hasTitle && hasImage) || (hasTitle && hasPrice);
}

// Retailers known to block HTML scraping — skip straight to LinkPreview
// Only list sites where we have a specific strategy (Amazon URL parsing).
// All other sites try HTML first — the fast-fail block detector handles the rest.
// Add sites here only when confirmed to fail HTML scraping.
const BLOCKED_RETAILERS = [
  "amazon.co.uk", "amazon.com", "amazon.de", "amazon.fr",
  "amazon.es", "amazon.it", "amazon.ca", "amazon.com.au",
  "amazon.co.jp", "amazon.in",
  // Confirmed HTML failures
  "harrods.com", "etsy.com", "next.co.uk",
  "net-a-porter.com", "thewhitecompany.com",
  "notonthehighstreet.com",
];

function isBlockedRetailer(url = "") {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return BLOCKED_RETAILERS.some(r => host === r || host.endsWith("." + r));
  } catch {
    return false;
  }
}

// Extract useful data from Amazon URLs directly
function parseAmazonUrl(url = "") {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (!host.startsWith("amazon.")) return null;

    // Extract ASIN from URL path
    const asinMatch = parsed.pathname.match(/\/dp\/([A-Z0-9]{10})|\/gp\/product\/([A-Z0-9]{10})/);
    const asin = asinMatch?.[1] || asinMatch?.[2];
    if (!asin) return null;

    // Extract title from URL slug
    const slugMatch = parsed.pathname.match(/\/([^\/]+)\/dp\//);
    const slug = slugMatch?.[1] || "";
    const title = slug
      .replace(/-/g, " ")
      .replace(/\b\w/g, c => c.toUpperCase())
      .trim() || "Amazon product";

    // Build Amazon image URL from ASIN
    const image = ""; // LinkPreview will provide the image

    // Detect currency from domain
    const currency = host.endsWith(".co.uk") ? "GBP"
      : host.endsWith(".de") || host.endsWith(".fr") || host.endsWith(".es") || host.endsWith(".it") ? "EUR"
      : "USD";

    const siteName = host.replace("amazon.", "Amazon ").replace(".co.uk", "UK").replace(".com", "").trim();

    return { asin, title, image, currency, siteName, url: parsed.toString() };
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 3500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      cache: "no-store",
    });
  } finally {
    clearTimeout(timer);
  }
}

function parseHtmlPreview({ html, finalUrl, status, preferredCurrency }) {
  const $ = cheerio.load(html);

  const canonicalUrl =
    cleanCanonicalUrl(
      makeAbsolute(getAttrValue($, ['link[rel="canonical"]'], "href") || "", finalUrl) || finalUrl
    );

  const bodyText = cleanText($("body").text() || "");
  const titleTag = cleanText($("title").first().text() || "");
  const h1 = cleanText($("h1").first().text() || "");

  const title =
    getMeta($, ['meta[property="og:title"]', 'meta[name="twitter:title"]']) ||
    getText($, ["h1", "title"]) ||
    "";

  const description =
    getMeta($, [
      'meta[property="og:description"]',
      'meta[name="description"]',
      'meta[name="twitter:description"]',
    ]) || "";

  const siteName =
    getMeta($, ['meta[property="og:site_name"]']) ||
    hostname(canonicalUrl);

  const image = getImage($, finalUrl);
  const priceText = extractDomPrice($);

  const detectedCurrency = detectCurrency(priceText);
  const numericPrice =
    detectedCurrency === preferredCurrency ? extractNumericPrice(priceText) : null;

  const blocked =
    status === 403 ||
    status === 429 ||
    status === 500 ||
    status === 503 ||
    includesBlockedText(titleTag) ||
    includesBlockedText(h1) ||
    includesBlockedText(bodyText);

  const hasTitle = Boolean(title);
  const hasImage = Boolean(image);
  const hasPrice = Boolean(priceText);

  const confidence =
    hasTitle && hasImage && hasPrice
      ? "high"
      : hasTitle && (hasImage || hasPrice)
        ? "medium"
        : "low";

  return {
    url: canonicalUrl,
    title: title || "Shared item",
    titleShort: title || "Shared item",
    description: blocked ? "Retailer returned a blocked or challenge page." : description,
    siteName,
    image: blocked ? "" : image,
    selectedImage: blocked ? "" : image,
    imageCandidates: !blocked && image ? [image] : [],
    priceText:
      !blocked && detectedCurrency === preferredCurrency ? priceText : "",
    numericPrice,
    detectedCurrency:
      !blocked && detectedCurrency === preferredCurrency ? detectedCurrency : null,
    brand: "",
    confidence: blocked ? "low" : confidence,
    needsReview: blocked ? true : !(hasTitle && hasImage),
    blocked,
    blockReason: blocked ? "html-blocked" : null,
    blockMessage: blocked ? "Retailer returned a blocked or challenge page." : "",
    source: "html",
    debug: {
      provider: "html",
      status,
      finalUrl,
      canonicalUrl,
      hostname: hostname(canonicalUrl),
      titleTag,
      h1,
      bodySnippet: bodyText.slice(0, 1000),
      extractedTitle: title,
      extractedDescription: description,
      extractedImage: image,
      extractedPrice: priceText,
      productSignals: {
        hasTitle,
        hasImage,
        hasPrice,
      },
    },
  };
}

async function tryHtmlPreview(inputUrl, preferredCurrency) {
  const res = await fetchWithTimeout(
    inputUrl,
    {
      method: "GET",
      headers: HTML_HEADERS,
      redirect: "follow",
    },
    3500
  );

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) {
    throw new Error("URL did not return HTML.");
  }

  const html = await res.text();
  if (!html.trim()) {
    throw new Error("Empty HTML response.");
  }

  // Fast-fail if response looks like a bot challenge page
  const htmlLower = html.slice(0, 4000).toLowerCase();
  if (
    includesBlockedText(htmlLower) ||
    res.status === 403 ||
    res.status === 429 ||
    htmlLower.includes("cf-browser-verification") ||
    htmlLower.includes("challenge-form") ||
    htmlLower.includes("turnstile") ||
    htmlLower.includes("datadome") ||
    htmlLower.includes("perimeterx") ||
    htmlLower.includes("imperva")
  ) {
    throw new Error("BLOCKED: Site returned a bot challenge page.");
  }

  return parseHtmlPreview({
    html,
    finalUrl: res.url || inputUrl,
    status: res.status,
    preferredCurrency,
  });
}

async function fetchLinkPreview(inputUrl) {
  const apiKey = process.env.LINKPREVIEW_API_KEY;

  if (!apiKey) {
    throw new Error("Missing LINKPREVIEW_API_KEY");
  }

  const apiUrl = new URL("https://api.linkpreview.net/");
  apiUrl.searchParams.set("q", inputUrl);

  const res = await fetchWithTimeout(
    apiUrl.toString(),
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Linkpreview-Api-Key": apiKey,
      },
    },
    2500
  );

  const raw = await res.text();
  let data = null;

  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    throw new Error("LinkPreview returned invalid JSON.");
  }

  if (!res.ok) {
    throw new Error(
      data?.error ||
        data?.message ||
        data?.msg ||
        `LinkPreview request failed with status ${res.status}`
    );
  }

  return data;
}

function mapLinkPreviewResult(inputUrl, payload, preferredCurrency = "GBP") {
  const finalUrl = cleanCanonicalUrl(payload?.url || inputUrl);
  const title = cleanText(payload?.title || "");
  const description = cleanText(payload?.description || "");
  const image = String(payload?.image || "").trim();
  const siteName =
    cleanText(payload?.site_name || payload?.siteName || "") ||
    hostname(finalUrl);

  const rawPrice =
    String(payload?.price || "").trim() ||
    String(payload?.priceText || "").trim() ||
    String(payload?.amount || "").trim();

  const detectedCurrency = detectCurrency(rawPrice);
  const numericPrice =
    detectedCurrency === preferredCurrency ? extractNumericPrice(rawPrice) : null;

  const hasTitle = Boolean(title);
  const hasImage = Boolean(image);
  const hasPrice = Boolean(rawPrice);

  const confidence =
    hasTitle && hasImage
      ? "high"
      : hasTitle || hasImage
        ? "medium"
        : "low";

  return {
    url: finalUrl,
    title: title || "Shared item",
    titleShort: title || "Shared item",
    description: description || "",
    siteName,
    image,
    selectedImage: image,
    imageCandidates: image ? [image] : [],
    priceText:
      detectedCurrency === preferredCurrency ? rawPrice : "",
    numericPrice,
    detectedCurrency:
      detectedCurrency === preferredCurrency ? detectedCurrency : null,
    brand: "",
    confidence,
    needsReview: !(hasTitle && hasImage),
    blocked: false,
    blockReason: null,
    blockMessage: "",
    source: "linkpreview",
    debug: {
      provider: "linkpreview",
      finalUrl,
      hostname: hostname(finalUrl),
      rawPayload: payload,
      productSignals: {
        hasTitle,
        hasImage,
        hasPrice,
      },
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

    let htmlResult = null;
    let htmlError = null;

    // Check for Amazon URL — parse directly without scraping
    const amazonData = parseAmazonUrl(inputUrl);
    if (amazonData) {
      const result = {
        url: amazonData.url,
        title: amazonData.title,
        titleShort: amazonData.title,
        description: "",
        siteName: amazonData.siteName,
        image: "",
        selectedImage: "",
        imageCandidates: [],
        priceText: "",
        numericPrice: null,
        detectedCurrency: amazonData.currency,
        brand: "",
        confidence: "medium",
        needsReview: true,
        blocked: false,
        blockReason: null,
        blockMessage: "",
        source: "amazon-parse",
      };
      // Still try LinkPreview in background for price
      try {
        const linkPreviewPayload = await fetchLinkPreview(inputUrl);
        const linkPreviewResult = mapLinkPreviewResult(inputUrl, linkPreviewPayload, preferredCurrency);
        if (linkPreviewResult.priceText) result.priceText = linkPreviewResult.priceText;
        if (linkPreviewResult.numericPrice) result.numericPrice = linkPreviewResult.numericPrice;
        if (linkPreviewResult.title && linkPreviewResult.title !== "Shared item") result.title = linkPreviewResult.title;
        if (linkPreviewResult.image) { result.image = linkPreviewResult.image; result.selectedImage = linkPreviewResult.image; }
        result.needsReview = !(result.title && result.image);
        result.confidence = result.image ? (result.priceText ? "high" : "medium") : "low";
        result.confidence = result.priceText ? "high" : "medium";
      } catch {
        // LinkPreview failed — use Amazon parse result as-is
      }
      return NextResponse.json(result, { status: 200 });
    }

    // For known blocked retailers, skip HTML scraping entirely
    if (!isBlockedRetailer(inputUrl)) {
      try {
        htmlResult = await tryHtmlPreview(inputUrl, preferredCurrency);
        if (isUsablePreview(htmlResult)) {
          return NextResponse.json(htmlResult, { status: 200 });
        }
      } catch (err) {
        htmlError = err;
      }
    }

    try {
      const linkPreviewPayload = await fetchLinkPreview(inputUrl);
      const linkPreviewResult = mapLinkPreviewResult(
        inputUrl,
        linkPreviewPayload,
        preferredCurrency
      );

      if (isUsablePreview(linkPreviewResult)) {
        linkPreviewResult.debug.htmlAttempt = htmlResult || null;
        linkPreviewResult.debug.htmlError = htmlError?.message || null;
        return NextResponse.json(linkPreviewResult, { status: 200 });
      }

      const manual = buildManualReviewResponse(
        inputUrl,
        "We couldn’t fill this automatically. Please review and save it manually."
      );

      manual.debug.htmlAttempt = htmlResult || null;
      manual.debug.htmlError = htmlError?.message || null;
      manual.debug.linkPreviewPayload = linkPreviewPayload || null;

      return NextResponse.json(manual, { status: 200 });
    } catch (linkPreviewError) {
      const manual = buildManualReviewResponse(
        inputUrl,
        linkPreviewError?.message ||
          htmlError?.message ||
          "We couldn’t fill this automatically. Please review and save it manually."
      );

      manual.debug.htmlAttempt = htmlResult || null;
      manual.debug.htmlError = htmlError?.message || null;
      manual.debug.linkPreviewError = linkPreviewError?.message || null;

      return NextResponse.json(manual, { status: 200 });
    }
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || "Unexpected error." },
      { status: 500 }
    );
  }
}
