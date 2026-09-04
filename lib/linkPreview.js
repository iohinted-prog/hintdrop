import * as cheerio from "cheerio";

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

// ASOS uses the same kind of Scene7-style dynamic image CDN as John
// Lewis (special-cased further down for that exact reason). Their
// og:image meta tag is a bare URL with no size params at all, which
// renders at a low default resolution; gallery thumbnails found on
// the page carry their own small explicit wid (e.g. wid=44, sized for
// a tiny thumbnail strip). The page's own twitter:image tag on the
// exact same image path proves a real high-res version exists at the
// same URL - it just adds wid/hei/fit params. Always SETS (not just
// adds when missing) a decent size, since a thumbnail's existing
// small wid needs overriding too, not just a bare URL's missing one.
export function upgradeAsosImageResolution(url = "") {
  if (!url.includes("images.asos-media.com")) return url;
  try {
    const parsed = new URL(url);
    // Strip any existing preset macro (e.g. a thumbnail's $n_240w$,
    // which parses as a bare/valueless param name) - leaving one in
    // place alongside an explicit wid/hei risks the preset's own
    // bundled size winning, depending on how Scene7 resolves the two.
    for (const key of [...parsed.searchParams.keys()]) {
      if (key.startsWith("$")) parsed.searchParams.delete(key);
    }
    parsed.searchParams.set("wid", "750");
    parsed.searchParams.set("hei", "750");
    parsed.searchParams.set("fit", "constrain");
    return parsed.toString();
  } catch {
    return url;
  }
}

// Adobe Scene7 (Dynamic Media) is a widely-used enterprise image CDN,
// not something specific to any one retailer — John Lewis and ASOS
// both turned out to be on it, each hardcoded separately above before
// this existed. Rather than adding another one-off per-domain fix
// every time a new retailer turns out to be on the same platform
// (Selfridges was the trigger for this one — confirmed via a real
// product page's og:image: images.selfridges.com/is/image/selfridges/
// R03831544_WHITE_M), this recognizes Scene7's own "Image Serving" URL
// convention directly: a path containing /is/image/ is Scene7's own
// standardized routing pattern, not anything Selfridges-specific — any
// other retailer using the same convention is covered automatically,
// without needing to be individually found and reported first.
//
// Does NOT replace the John Lewis (/i/{Company}/{id}, needs fmt=auto
// specifically) or ASOS (images.asos-media.com/products/…, no
// /is/image/ in its path at all) fixes above — both are on Scene7 too,
// just configured with different URL routing this pattern doesn't
// match. Those stay as their own fixes; this catches everything else
// using the standard /is/image/ convention.
export function upgradeScene7ImageResolution(url = "") {
  try {
    const parsed = new URL(url);
    if (!parsed.pathname.includes("/is/image/")) return url;
    for (const key of [...parsed.searchParams.keys()]) {
      if (key.startsWith("$")) parsed.searchParams.delete(key);
    }
    parsed.searchParams.set("wid", "750");
    parsed.searchParams.set("hei", "750");
    parsed.searchParams.set("fit", "constrain");
    return parsed.toString();
  } catch {
    return url;
  }
}

// Gathers multiple distinct image candidates instead of collapsing to
// a single "best guess" - the previous version's own last-resort
// fallback (the very first <img> tag anywhere on the page) is exactly
// how a header logo or nav icon ends up chosen as a "product photo":
// some retailers never override their site-wide default og:image on
// individual product pages, and the first <img> on a page is very
// often the header logo, not the product itself further down in a
// gallery. Rather than trying to detect and exclude logos specifically
// (unreliable - a small square image is not reliably distinguishable
// from a small square product photo), this instead gathers several
// real candidates and lets the person pick, reusing the imageOptions
// picker UI already built and working for the AI-experience-idea flow
// (see AddHintModal in HintsClient.jsx) rather than building new UI.
// <img> tags scraped from gallery containers often carry a small
// default in `src` (a lazy-loading placeholder or thumbnail), with the
// real full-size version only available via `srcset`'s width-described
// list (e.g. "small.jpg 400w, large.jpg 1200w") - the reason candidates
// gathered this way tend to be visibly lower quality than og:image
// (which retailers curate directly for sharing, always at full size).
// Picks the widest-described entry when srcset is present, falling
// back to plain src/data-src otherwise.
function pickBestImageSrc($el) {
  const srcset = $el.attr("srcset") || $el.attr("data-srcset") || "";
  if (srcset) {
    const candidates = srcset
      .split(",")
      .map((part) => part.trim().split(/\s+/))
      .filter(([url]) => Boolean(url))
      .map(([url, descriptor]) => ({
        url,
        width: descriptor && descriptor.endsWith("w") ? parseInt(descriptor, 10) : 0,
      }));
    if (candidates.length) {
      candidates.sort((a, b) => b.width - a.width);
      return candidates[0].url;
    }
  }
  return $el.attr("src") || $el.attr("data-src") || "";
}

function getImageCandidates($, base = "", extraFirst = []) {
  const seen = new Set();
  const candidates = [];
  const MAX_CANDIDATES = 6;

  function add(raw) {
    if (candidates.length >= MAX_CANDIDATES) return;
    const abs = upgradeScene7ImageResolution(upgradeAsosImageResolution(makeAbsolute(String(raw || "").trim(), base)));
    if (!abs || seen.has(abs) || looksLikeGenericSiteAsset(abs)) return;
    seen.add(abs);
    candidates.push(abs);
  }

  // JSON-LD Product image goes first - it's structured data
  // specifically curated to represent the product (required by Google
  // for rich results), at least as reliable as og:image, and often
  // present when og:image is missing entirely.
  extraFirst.forEach(add);

  // Every og:image tag, not just the first - some sites do declare
  // more than one for a real product gallery.
  $('meta[property="og:image"]').each((_, el) => add($(el).attr("content")));
  $('meta[name="twitter:image"]').each((_, el) => add($(el).attr("content")));
  add(getAttrValue($, ['link[rel="image_src"]'], "href"));

  // Images inside likely product-gallery containers - broader and more
  // targeted than just the very first <img> tag anywhere on the page,
  // which is what previously picked up header logos so often.
  $('[itemprop="image"], [class*="product-gallery"] img, [class*="product-image"] img, [class*="ProductGallery"] img, [class*="gallery"] img')
    .each((_, el) => add(pickBestImageSrc($(el))));

  // Numbered gallery alt-text pattern (e.g. "Product Name, 1 of 10") -
  // added after finding Not On The High Street product pages have no
  // og:image meta tag at all, but do reliably use this exact alt-text
  // convention on their real gallery images. A useful fallback signal
  // distinct from container class names, which vary a lot site to site.
  $("img[alt]").each((_, el) => {
    const alt = $(el).attr("alt") || "";
    if (/\b\d+\s+of\s+\d+\b/i.test(alt)) {
      add(pickBestImageSrc($(el)));
    }
  });

  // Last resort, same as before - only reached if nothing above found
  // anything at all.
  if (candidates.length === 0) {
    $("img[src]").each((_, el) => {
      if (candidates.length >= 3) return;
      add(pickBestImageSrc($(el)));
    });
  }

  return candidates;
}

function getImage($, base = "") {
  const candidates = [
    getMeta($, ['meta[property="og:image"]', 'meta[name="twitter:image"]']),
    getAttrValue($, ['link[rel="image_src"]'], "href"),
    getAttrValue($, ["img[src]"], "src"),
  ].filter(Boolean);

  for (const candidate of candidates) {
    const abs = upgradeScene7ImageResolution(upgradeAsosImageResolution(makeAbsolute(candidate, base)));
    if (abs && !looksLikeGenericSiteAsset(abs)) return abs;
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
// Realized something important while debugging why AliExpress's fix
// wasn't taking effect: being on this list means direct fetch never
// even runs, skipping straight to LinkPreview.net - which doesn't do
// JSON-LD extraction (or any of today's other fixes) at all, since it
// only returns pre-parsed fields, not raw HTML. So blocking a site
// speculatively doesn't just fail to help, it actively prevents every
// other fix in this file from ever getting a chance on that domain.
//
// The other half of the realization: blocking has no real safety
// benefit either. getProductPreview() already falls through to
// LinkPreview.net automatically whenever direct fetch doesn't produce
// a usable result (see isUsablePreview() below) - that safety net
// exists independent of this list. So this list should only ever
// contain sites with real, specific evidence of a problem direct
// fetch can't work around - not "reported as having some kind of
// image issue," which today's fixes (Scene7 resolution, the generic-
// asset filter, JSON-LD extraction, title ranking) may well already
// solve if only given the chance to run.
//
// Removed everything today that didn't meet that bar - including four
// entries ("Confirmed HTML failures") that had never actually been
// re-tested since being added in an earlier session, the same pattern
// that turned out to be wrong for AliExpress. Kept only two:
const BLOCKED_RETAILERS = [
  // Deliberate, not a workaround - parseAmazonUrl() below is a real
  // specialized fast path for Amazon's URL structure, and Amazon's
  // own robots.txt disallows automated access outright regardless.
  "amazon.co.uk", "amazon.com", "amazon.de", "amazon.fr",
  "amazon.es", "amazon.it", "amazon.ca", "amazon.com.au",
  "amazon.co.jp", "amazon.in",
  // Confirmed today, not inherited from an earlier session: a real
  // fetch through a full headless-browser/proxy service got redirected
  // to Shein's own CAPTCHA wall (captcha_type=903). Real evidence of
  // an active block, not a guess.
  "shein.com",
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

// Many modern e-commerce sites (schema.org reports 45M+ domains using
// structured data as of 2024) embed a JSON-LD <script
// type="application/ld+json"> block with @type: "Product" - required
// by Google for rich search results (star ratings, price shown
// directly in listings), which means it's often present even on pages
// whose og:image/og:title meta tags are missing or broken. Confirmed
// this gap directly: two different Trader Joe's product pages both
// returned a correct title but a null image even through a full
// headless-browser fetch (tested via Microlink's API) - the page
// genuinely has no og:image, and JSON-LD is the most likely place a
// real image URL is still recoverable from.
function extractJsonLdProduct($) {
  const scripts = $('script[type="application/ld+json"]');
  for (let i = 0; i < scripts.length; i++) {
    let parsed;
    try {
      parsed = JSON.parse($(scripts[i]).html() || "");
    } catch {
      continue;
    }

    // Three shapes seen in the wild across different site-builders: a
    // single Product object, a bare array of objects, or a
    // @graph-wrapped collection.
    const candidates = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.["@graph"])
        ? parsed["@graph"]
        : [parsed];

    const product = candidates.find((entry) => {
      const type = entry?.["@type"];
      return type === "Product" || (Array.isArray(type) && type.includes("Product"));
    });

    if (!product) continue;

    const rawImage = product.image;
    const image = Array.isArray(rawImage)
      ? rawImage[0]
      : typeof rawImage === "object" && rawImage
        ? rawImage.url
        : rawImage;

    // Confirmed real shape on H&M product pages: no direct offers field
    // at all on the Product itself - price only exists nested inside
    // each entry of a hasVariant array (one per size/color SKU). Other
    // H&M pages do have offers directly on the product (both shapes
    // seen on the same site), so check both rather than assuming one.
    const directOffers = Array.isArray(product.offers) ? product.offers[0] : product.offers;
    const variantOffers = Array.isArray(product.hasVariant)
      ? (Array.isArray(product.hasVariant[0]?.offers) ? product.hasVariant[0].offers[0] : product.hasVariant[0]?.offers)
      : null;
    const offers = directOffers || variantOffers;

    return {
      name: typeof product.name === "string" ? product.name : "",
      image: typeof image === "string" ? image : "",
      price: offers?.price != null ? String(offers.price) : "",
      currency: typeof offers?.priceCurrency === "string" ? offers.priceCurrency : "",
    };
  }
  return null;
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

  // A title that's only one short word (e.g. "MARC" instead of "MARC
  // JACOBS - Scene Small Leather Shoulder Bag") is essentially always
  // a parsing failure, not a real product title — found on Selfridges,
  // whose actual og:title is confirmed complete and correct on a real
  // fetch of the page, meaning something about our own server's
  // request to the same URL is getting a different, degraded result
  // (bot-challenge/interstitial content is the likely mechanism, not
  // confirmed). Rather than accepting whatever single word survives
  // that degraded response, rank every source we have and prefer the
  // longest one that clears a minimal trustworthiness bar, only
  // falling back to a short one if nothing better exists at all.
  const ogTitle = getMeta($, ['meta[property="og:title"]']);
  const twitterTitle = getMeta($, ['meta[name="twitter:title"]']);
  const jsonLdProduct = extractJsonLdProduct($);
  const MIN_TRUSTED_TITLE_LENGTH = 8;
  const isTrustworthyTitle = (candidate) =>
    Boolean(candidate) && (candidate.length >= MIN_TRUSTED_TITLE_LENGTH || candidate.includes(" "));
  const titleCandidates = [ogTitle, twitterTitle, jsonLdProduct?.name, h1, titleTag].filter(Boolean);
  const title =
    titleCandidates.find(isTrustworthyTitle) ||
    titleCandidates.sort((a, b) => b.length - a.length)[0] ||
    "";
  const titleLooksUnreliable = Boolean(title) && !isTrustworthyTitle(title);

  const description =
    getMeta($, [
      'meta[property="og:description"]',
      'meta[name="description"]',
      'meta[name="twitter:description"]',
    ]) || "";

  const siteName =
    getMeta($, ['meta[property="og:site_name"]']) ||
    hostname(canonicalUrl);

  const imageCandidates = getImageCandidates($, finalUrl, jsonLdProduct?.image ? [jsonLdProduct.image] : []);
  // Falls back to the original single-image logic only if the new
  // gatherer somehow found nothing at all - in practice it checks the
  // exact same sources first (og:image, twitter:image, image_src) plus
  // more, so this is just a safety net, not the normal path.
  const image = imageCandidates[0] || getImage($, finalUrl);
  // JSON-LD's raw price is just a bare number ("25.00", no currency
  // symbol) - detectCurrency below only matches symbols, not ISO codes
  // like "GBP", so a bare fallback would silently break currency
  // detection. Converting the code to the matching symbol first keeps
  // it compatible with the exact same detection this file already does
  // for scraped DOM prices.
  const CURRENCY_SYMBOLS = { GBP: "£", USD: "$", EUR: "€", AUD: "A$", NZD: "NZ$", CAD: "C$" };
  const jsonLdPriceText = jsonLdProduct?.price
    ? `${CURRENCY_SYMBOLS[jsonLdProduct.currency] || ""}${jsonLdProduct.price}`
    : "";
  const priceText = extractDomPrice($) || jsonLdPriceText;

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
    imageCandidates: blocked ? [] : imageCandidates,
    priceText:
      !blocked && detectedCurrency === preferredCurrency ? priceText : "",
    numericPrice,
    detectedCurrency:
      !blocked && detectedCurrency === preferredCurrency ? detectedCurrency : null,
    brand: "",
    confidence: blocked ? "low" : confidence,
    needsReview: blocked ? true : !(hasTitle && hasImage) || titleLooksUnreliable,
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
        titleLooksUnreliable,
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
    5000
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
  const rawImage = upgradeScene7ImageResolution(upgradeAsosImageResolution(String(payload?.image || "").trim()));
  const image = looksLikeGenericSiteAsset(rawImage) ? "" : rawImage;
  // Always use hostname as primary retailer — siteName from LinkPreview is inconsistent
  const siteName = hostname(finalUrl) ||
    cleanText(payload?.site_name || payload?.siteName || "");

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

// Shared entry point — used by both app/api/link-preview/route.js (the
// user-facing "add hint from URL" feature) and app/api/cron/price-
// refresh/route.js (scheduled price/stock checks on existing catalog
// items). Originally lived only inline in the route handler; extracted
// here so the price-refresh cron can reuse the exact same scraping
// logic (HTML-first, LinkPreview.net fallback, blocked-retailer list,
// price/currency detection) rather than duplicating or reimplementing
// it. Returns the same result object the route used to build directly;
// callers decide what to do with it (route.js wraps it in
// NextResponse.json, the cron route reads numericPrice/blocked/debug
// off it directly).
function isAmazonUrl(url = "") {
  const host = hostname(url);
  return host === "amazon" || host.startsWith("amazon.");
}

// Amazon is on BLOCKED_RETAILERS (confirmed — amazon.co.uk's own
// robots.txt disallows automated fetches entirely, and their anti-bot
// posture is extremely well documented, unlike the other four
// BLOCKED_RETAILERS entries which still need real verification). So
// every Amazon lookup goes through LinkPreview.net. The problem: when
// LinkPreview's own request gets caught by Amazon's bot detection, the
// page it receives is a robot-check/CAPTCHA page, not the real product
// page — and that page's og:image is a logo or CAPTCHA graphic, not
// the product photo. LinkPreview has no way to know this; it just
// reports whatever og:image was on the page it got back.
//
// Real Amazon product photos are always served from the /images/I/
// ("Item") path on their media CDN — every genuine product image
// already confirmed in shop_products follows this pattern. Generic
// assets (site logo, share-card image, CAPTCHA graphics) live under
// /images/G/ or other paths. Checking the URL shape is reliable and
// consistent across Amazon's CDN; trying to detect "looks like a
// logo" from the image itself would not be.
//
// This can only ever catch and discard a bad image — it can't produce
// a better one. Getting an actually-reliable Amazon product image
// would need either Amazon's own Product Advertising API (requires an
// approved Associates account with real sales history) or a paid
// headless-browser scraping service — both out of scope here.
export function isLikelyRealAmazonProductImage(imageUrl = "") {
  try {
    const url = new URL(imageUrl);
    const host = url.hostname.replace(/^www\./i, "");
    const isAmazonImageHost =
      host === "m.media-amazon.com" ||
      host.endsWith(".ssl-images-amazon.com") ||
      host === "images-amazon.com";
    return isAmazonImageHost && url.pathname.includes("/images/I/");
  } catch {
    return false;
  }
}

// Retailer-agnostic version of the same problem the Amazon check above
// solves for one specific site: an image that isn't really a product
// photo at all — a favicon or a third-party tooling artifact — picked
// up because a retailer's page never overrides its site-wide default
// image on individual product pages, or because a bot-check/consent-
// banner interstitial got scraped instead of the real page. Built
// after auditing the existing shop catalog for exactly this pattern
// (the same image reused across many different products from one
// retailer is close to definitive proof it's not a real photo): found
// Fortnum & Mason (every product sharing one logo icon), Soho Home (an
// apple-touch-icon favicon), PlayStation (a favicon), and The White
// Company (a logo belonging to onetrust.com — a cookie-consent banner
// vendor, not even the retailer's own site).
//
// This function only catches the favicon/social-share/non-content-host
// cases live, at scrape time, for both new Hints and new shop catalog
// entries going forward. It deliberately does NOT try to catch a bare
// "logo" filename the way Fortnum & Mason's case had one (see below) —
// that's genuinely ambiguous on a single URL in isolation. Catching
// that class of case relies on the duplicate-image audit instead (the
// SQL query used to find all four cases above in the first place):
// when a bulk catalog exists to check against, "the exact same image
// reused across dozens of unrelated products" is a far more reliable
// signal than any filename heuristic, without the false-positive risk.
// Worth re-running that audit periodically rather than expecting this
// function alone to catch everything.
//
// Two independent signals, matched against a path SEGMENT (bounded by
// / _ - or a file extension), not a loose substring. Deliberately
// excludes generic-sounding words that are also common in real product
// names — "logo" was tested and dropped for exactly this reason: it
// correctly caught Fortnum & Mason's fortnums-logo-icon-57.png, but
// also false-positived on an ordinary product path like
// nike-logo-print-tee-black (a completely normal product name in
// fashion retail). Every term kept here is one that essentially never
// appears in a real product name/slug.
const GENERIC_ASSET_SEGMENT = /(^|[/_-])(favicon|apple-touch-icon|placeholder|no-?image|default-?image|social-?share|og-?image)(?=[/_.-]|$)/i;
// Known non-content vendors (consent-management platforms, tag
// managers, analytics) whose assets sometimes get scraped instead of
// the retailer's own page content when a cookie/consent interstitial
// is what actually got fetched.
const NON_CONTENT_IMAGE_HOSTS = [".onetrust.com", ".cookiebot.com", ".trustarc.com"];

export function looksLikeGenericSiteAsset(imageUrl = "") {
  try {
    const url = new URL(imageUrl);
    if (NON_CONTENT_IMAGE_HOSTS.some((h) => url.hostname.endsWith(h))) return true;
    return GENERIC_ASSET_SEGMENT.test(url.pathname);
  } catch {
    return false;
  }
}

// review count) is composited on the fly via chained URL directives
// appended after the real image ID, not actually part of the base
// photo. Confirmed by decoding one directly: a segment like
// "_Z<base64>,60,875,420,420,0,0_" decodes to literally
// `<span foreground="#0F1111" font="AmazonEmber 66">4.8</span>` — the
// rating number, rendered as text by Amazon's own image service. The
// underlying pattern (strip everything after the first real extension
// to get the unmodified base image) is also independently documented
// as a general Amazon image-CDN behavior, not specific to rating
// badges — border padding, resize directives, and rating overlays are
// all the same mechanism. This is a strictly better fix than trying to
// detect the badge as "text" on the rendered pixels (OCR, tried and
// reverted after too many false positives/negatives and unacceptable
// latency): it addresses the actual mechanism producing the badge,
// costs nothing, and adds no latency.
export function stripAmazonImageDirectives(imageUrl = "") {
  const match = String(imageUrl || "").match(
    /^(https:\/\/(?:m\.media-amazon\.com|[a-z0-9.-]*\.ssl-images-amazon\.com|images-amazon\.com)\/images\/I\/[A-Za-z0-9+\-_]+\.(?:jpg|jpeg|png|gif))/i
  );
  return match ? match[1] : imageUrl;
}

async function getProductPreviewInternal(rawUrl, currency = "GBP") {
  const inputUrl = ensureHttpUrl(rawUrl || "");
  const preferredCurrency = String(currency || "GBP").toUpperCase();

  if (!inputUrl) {
    const err = new Error("Please provide a valid URL.");
    err.status = 400;
    throw err;
  }

  let htmlResult = null;
  let htmlError = null;

  if (!isBlockedRetailer(inputUrl)) {
    try {
      htmlResult = await tryHtmlPreview(inputUrl, preferredCurrency);
      if (isUsablePreview(htmlResult)) {
        return htmlResult;
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

    if (isAmazonUrl(inputUrl) && linkPreviewResult.image) {
      if (!isLikelyRealAmazonProductImage(linkPreviewResult.image)) {
        linkPreviewResult.image = "";
        linkPreviewResult.selectedImage = "";
        linkPreviewResult.imageCandidates = [];
        linkPreviewResult.needsReview = true;
        linkPreviewResult.debug.discardedAmazonImage = linkPreviewPayload?.image || null;
      } else {
        linkPreviewResult.image = stripAmazonImageDirectives(linkPreviewResult.image);
        linkPreviewResult.selectedImage = linkPreviewResult.image;
        linkPreviewResult.imageCandidates = linkPreviewResult.imageCandidates.map(
          stripAmazonImageDirectives
        );
      }
    }

    if (isUsablePreview(linkPreviewResult)) {
      linkPreviewResult.debug.htmlAttempt = htmlResult || null;
      linkPreviewResult.debug.htmlError = htmlError?.message || null;

      // The HTML attempt may have run (and even found real image
      // candidates via getImageCandidates) without being "usable"
      // enough to return on its own — e.g. it found images but no
      // title/price, or vice versa. Rather than discarding those
      // candidates just because LinkPreview.net ended up being the
      // source of truth for title/price, fold them in here so the
      // person still gets a real choice if LinkPreview's single image
      // (which itself can be a site logo — LinkPreview's API has no
      // multi-image field at any plan tier, so it's not exempt from
      // this problem either) turns out to be wrong. LinkPreview's own
      // image stays first/default so existing behaviour is unchanged
      // when there's nothing to add.
      if (Array.isArray(htmlResult?.imageCandidates) && htmlResult.imageCandidates.length) {
        const seen = new Set(linkPreviewResult.imageCandidates);
        const extra = htmlResult.imageCandidates.filter((url) => !seen.has(url));
        linkPreviewResult.imageCandidates = [
          ...linkPreviewResult.imageCandidates,
          ...extra,
        ].slice(0, 6);
      }

      return linkPreviewResult;
    }

    const manual = buildManualReviewResponse(
      inputUrl,
      "We couldn’t fill this automatically. Please review and save it manually."
    );

    manual.debug.htmlAttempt = htmlResult || null;
    manual.debug.htmlError = htmlError?.message || null;
    manual.debug.linkPreviewPayload = linkPreviewPayload || null;

    return manual;
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

    return manual;
  }
}

// Dependency-free image dimension probe - reads just enough bytes to
// parse each format's header, no full image decode or new dependency
// needed (deliberately avoided adding sharp or similar as a new
// production dependency for this - a native binary module is a real
// build-risk on Vercel to introduce without being able to verify the
// full deploy succeeds). Covers JPEG, PNG, WebP, GIF - the vast
// majority of real-world product images. Tested directly against
// real generated images in each format before relying on it.
function getImageDimensionsFromBuffer(buf) {
  if (buf.length >= 24 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (buf.length >= 10 && buf.toString("ascii", 0, 3) === "GIF") {
    return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
  }
  if (buf.length >= 30 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    const chunkType = buf.toString("ascii", 12, 16);
    if (chunkType === "VP8 ") {
      return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
    }
    if (chunkType === "VP8L") {
      const b = buf.readUInt32LE(21);
      return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 };
    }
    if (chunkType === "VP8X") {
      return {
        width: (buf[24] | (buf[25] << 8) | (buf[26] << 16)) + 1,
        height: (buf[27] | (buf[28] << 8) | (buf[29] << 16)) + 1,
      };
    }
  }
  if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let offset = 2;
    while (offset < buf.length - 8) {
      if (buf[offset] !== 0xff) { offset++; continue; }
      const marker = buf[offset + 1];
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) };
      }
      const segmentLength = buf.readUInt16BE(offset + 2);
      offset += 2 + segmentLength;
    }
  }
  return null;
}

const MIN_IMAGE_DIMENSION = 200;

// Fetches only enough of an image to read its header (64KB is generous
// for every format handled above - real header data is typically in
// the first few hundred bytes, this just allows margin for other
// metadata some files place before the dimension-bearing chunk).
// Fails open on any error (network failure, timeout, undecodable
// format) - returns true (treat as acceptable) rather than block a
// real image just because this specific check couldn't complete.
async function imageMeetsMinimumSize(url, minDimension = MIN_IMAGE_DIMENSION) {
  if (!url || typeof url !== "string") return false;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      headers: { Range: "bytes=0-65535" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok && res.status !== 206) return true;
    const buf = Buffer.from(await res.arrayBuffer());
    const dims = getImageDimensionsFromBuffer(buf);
    if (!dims) return true;
    return dims.width >= minDimension && dims.height >= minDimension;
  } catch {
    return true;
  }
}

// Wraps the real implementation with a minimum-resolution check on
// whatever image it selected, regardless of which internal code path
// (direct HTML scrape vs LinkPreview.net fallback) produced the
// result - centralizing this here instead of touching every return
// point inside the existing, already-complex branching logic.
// Confirmed directly why this matters: a real shop product's stored
// "image" was literally a favicon (favicon?fmt=png-alpha) - no amount
// of scraping logic improvements fix a case like that, only checking
// the actual pixel dimensions does. Falls through the same
// imageCandidates list already being collected if the first choice is
// too small, and only clears the image (triggering the existing
// gradient-fallback path) if nothing in the candidate list meets the
// bar either.
export async function getProductPreview(rawUrl, currency = "GBP", options = {}) {
  const result = await getProductPreviewInternal(rawUrl, currency);

  if (options.skipImageSizeCheck) return result;
  if (!result?.image) return result;

  if (await imageMeetsMinimumSize(result.image)) return result;

  const candidates = Array.isArray(result.imageCandidates) ? result.imageCandidates : [];
  for (const candidate of candidates) {
    if (candidate === result.image) continue;
    if (await imageMeetsMinimumSize(candidate)) {
      result.image = candidate;
      result.selectedImage = candidate;
      return result;
    }
  }

  // Nothing usable found at any size - clear the image and let the
  // existing gradient-fallback / needsReview path handle it, same as
  // any other "couldn't find a real photo" case.
  result.image = "";
  result.selectedImage = "";
  result.needsReview = true;
  return result;
}
