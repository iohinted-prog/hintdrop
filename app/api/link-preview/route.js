import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

function normaliseUrl(value) {
  try {
    const url = new URL(value);
    return url.toString();
  } catch {
    return null;
  }
}

function absoluteUrl(maybeUrl, baseUrl) {
  if (!maybeUrl) return "";
  try {
    return new URL(maybeUrl, baseUrl).toString();
  } catch {
    return "";
  }
}

function extractPriceFromText(text = "") {
  const match =
    text.match(/(?:£|\$|€)\s?(\d+(?:,\d{3})*(?:\.\d{1,2})?)/) ||
    text.match(/(\d+(?:,\d{3})*(?:\.\d{1,2})?)/);

  if (!match) return null;
  return Number(match[1].replace(/,/g, ""));
}

async function fetchMicrolink(url) {
  const apiKey = process.env.MICROLINK_API_KEY;
  const endpoint = new URL("https://api.microlink.io/");

  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("meta", "true");
  endpoint.searchParams.set("palette", "false");
  endpoint.searchParams.set("screenshot", "false");
  endpoint.searchParams.set("audio", "false");
  endpoint.searchParams.set("video", "false");

  const response = await fetch(endpoint.toString(), {
    headers: apiKey ? { "x-api-key": apiKey } : {},
    next: { revalidate: 0 },
  });

  const json = await response.json();

  if (!response.ok || json.status === "fail") {
    throw new Error(json.message || "Microlink failed");
  }

  const data = json.data || {};
  const meta = data.meta || {};

  const title =
    data.title ||
    meta.title ||
    meta["og:title"] ||
    meta["twitter:title"] ||
    "";

  const description =
    data.description ||
    meta.description ||
    meta["og:description"] ||
    meta["twitter:description"] ||
    "";

  const image =
    data.image?.url ||
    data.logo?.url ||
    meta.image ||
    meta["og:image"] ||
    meta["twitter:image"] ||
    "";

  const publisher =
    data.publisher ||
    meta.publisher ||
    meta["og:site_name"] ||
    new URL(url).hostname.replace(/^www\./, "");

  const priceText =
    meta["product:price:amount"] ||
    meta["og:price:amount"] ||
    "";

  return {
    url: data.url || url,
    title,
    description,
    image,
    siteName: publisher,
    priceText: priceText ? `£${priceText}` : "",
    numericPrice: extractPriceFromText(priceText || description || title || ""),
  };
}

async function fetchFallback(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; HintedBot/1.0; +https://hinted.io)",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error("Could not fetch target page");
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const pick = (...values) => values.find((value) => typeof value === "string" && value.trim());

  const title = pick(
    $('meta[property="og:title"]').attr("content"),
    $('meta[name="twitter:title"]').attr("content"),
    $("title").first().text()
  ) || "Saved hint";

  const description = pick(
    $('meta[property="og:description"]').attr("content"),
    $('meta[name="description"]').attr("content"),
    $('meta[name="twitter:description"]').attr("content")
  ) || "";

  const image = absoluteUrl(
    pick(
      $('meta[property="og:image"]').attr("content"),
      $('meta[name="twitter:image"]').attr("content"),
      $("img").first().attr("src")
    ),
    url
  );

  const siteName = pick(
    $('meta[property="og:site_name"]').attr("content"),
    new URL(url).hostname.replace(/^www\./, "")
  );

  const bodyText = $("body").text().replace(/\s+/g, " ").trim().slice(0, 4000);
  const numericPrice = extractPriceFromText(bodyText);
  const priceText = numericPrice != null ? `About £${Math.round(numericPrice)}` : "";

  return {
    url,
    title,
    description,
    image,
    siteName,
    priceText,
    numericPrice,
  };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const url = normaliseUrl(body?.url);

    if (!url) {
      return NextResponse.json({ error: "Invalid URL." }, { status: 400 });
    }

    try {
      const data = await fetchMicrolink(url);
      return NextResponse.json(data);
    } catch {
      const data = await fetchFallback(url);
      return NextResponse.json(data);
    }
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Could not extract this link." },
      { status: 500 }
    );
  }
}
