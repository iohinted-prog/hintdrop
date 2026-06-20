import { NextRequest, NextResponse } from "next/server";

function decodeHtml(input: string) {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function firstMatch(html: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtml(match[1].trim());
  }
  return "";
}

function extractJsonLdBlocks(html: string) {
  const blocks: string[] = [];
  const regex =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(html))) {
    blocks.push(match[1]);
  }
  return blocks;
}

function findProductData(html: string) {
  const blocks = extractJsonLdBlocks(html);

  for (const raw of blocks) {
    try {
      const parsed = JSON.parse(raw.trim());
      const candidates = Array.isArray(parsed) ? parsed : [parsed];

      for (const item of candidates) {
        if (!item) continue;
        const type = item["@type"];
        const isProduct =
          type === "Product" ||
          (Array.isArray(type) && type.includes("Product"));

        if (!isProduct) continue;

        const offers = Array.isArray(item.offers) ? item.offers : item.offers ? [item.offers] : [];
        const offer = offers[0] || {};
        const image = Array.isArray(item.image) ? item.image[0] : item.image || "";
        return {
          title: item.name || "",
          image,
          priceText:
            offer.price != null
              ? `£${offer.price}`
              : offer.lowPrice != null
              ? `£${offer.lowPrice}`
              : "",
          siteName: item.brand?.name || "",
          url: item.url || "",
        };
      }
    } catch {
      continue;
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "Missing URL." }, { status: 400 });
    }

    const response = await fetch(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      },
      redirect: "follow",
    });

    const html = await response.text();

    const ogTitle = firstMatch(html, [
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i,
    ]);

    const ogImage = firstMatch(html, [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    ]);

    const ogDescription = firstMatch(html, [
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
    ]);

    const canonicalUrl = firstMatch(html, [
      /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i,
      /<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i,
    ]);

    const pageTitle =
      firstMatch(html, [/<title[^>]*>([^<]+)<\/title>/i]) ||
      ogTitle ||
      "";

    const productData = findProductData(html);

    const visibleTitle =
      productData?.title ||
      pageTitle ||
      ogTitle ||
      "";

    const priceText =
      productData?.priceText ||
      firstMatch(html, [
        /(?:£|GBP)\s?(\d+(?:\.\d{1,2})?)/i,
        /"price"\s*:\s*"?(\\d+(?:\.\d{1,2})?)"?/i,
        /itemprop=["']price["'][^>]*content=["']([^"']+)["']/i,
        /data-price=["']([^"']+)["']/i,
      ]);

    const image =
      productData?.image ||
      ogImage ||
      "";

    const siteName =
      firstMatch(html, [
        /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i,
      ]) || new URL(url).hostname.replace(/^www\./, "");

    return NextResponse.json({
      title: decodeHtml(visibleTitle),
      image,
      priceText: priceText ? `£${priceText.replace(/^£/, "")}` : "",
      siteName: decodeHtml(siteName),
      url: canonicalUrl || url,
      description: decodeHtml(ogDescription),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not fetch preview.",
      },
      { status: 500 }
    );
  }
}
