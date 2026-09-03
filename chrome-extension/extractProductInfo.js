// Runs inside the actual page (injected via chrome.scripting.executeScript),
// not in the extension's own context - so it only has access to normal DOM
// APIs, not chrome.* extension APIs. Must stay fully self-contained (no
// references to anything outside this function) since Chrome serializes it
// to run in the page's world.
function extractProductInfo() {
  // Same reasoning as lib/linkPreview.js's pickBestImageSrc: an <img>'s
  // plain src is often a small placeholder, with the real full-size image
  // only in srcset's width-described list.
  function pickBestImageSrc(el) {
    const srcset = el.getAttribute("srcset") || el.getAttribute("data-srcset") || "";
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
    return el.getAttribute("src") || el.getAttribute("data-src") || "";
  }

  // Same extraction logic as extractJsonLdProduct() in lib/linkPreview.js,
  // including the hasVariant-nested-offers fallback confirmed necessary for
  // real H&M product pages. Big advantage over the server-side version
  // running here instead: this runs after the page has fully loaded and
  // executed its own JavaScript, so client-rendered pages (Trader Joe's,
  // White Company) that only inject their JSON-LD after the fact are no
  // longer a problem - it's just sitting in the live DOM by the time this
  // runs.
  function extractJsonLdProduct() {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      let parsed;
      try {
        parsed = JSON.parse(script.textContent || "");
      } catch {
        continue;
      }

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

  function getMetaContent(selectors) {
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      const content = el?.getAttribute("content");
      if (content) return content.trim();
    }
    return "";
  }

  const jsonLd = extractJsonLdProduct();

  const ogTitle = getMetaContent(['meta[property="og:title"]']);
  const twitterTitle = getMetaContent(['meta[name="twitter:title"]']);
  const title = jsonLd?.name || ogTitle || twitterTitle || document.title || "";

  const ogImage = getMetaContent(['meta[property="og:image"]']);
  const twitterImage = getMetaContent(['meta[name="twitter:image"]']);
  let image = jsonLd?.image || ogImage || twitterImage || "";

  // Last resort, same spirit as the server-side fallback: if nothing above
  // found an image, grab the largest visible <img> on the page as a rough
  // guess, preferring srcset's biggest variant.
  if (!image) {
    const imgs = Array.from(document.querySelectorAll("img[src], img[srcset]"));
    let best = null;
    let bestArea = 0;
    for (const el of imgs) {
      const area = (el.naturalWidth || el.width || 0) * (el.naturalHeight || el.height || 0);
      if (area > bestArea) {
        bestArea = area;
        best = el;
      }
    }
    if (best) image = pickBestImageSrc(best);
  }

  return {
    title: title.trim(),
    image,
    price: jsonLd?.price || "",
    currency: jsonLd?.currency || "",
    url: window.location.href,
  };
}
