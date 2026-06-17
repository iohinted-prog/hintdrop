import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

function readMeta($, selectors) {
  for (const selector of selectors) {
    const value = $(selector).attr("content") || $(selector).attr("href");
    if (value && value.trim()) return value.trim();
  }
  return "";
}

function absoluteUrl(value, base) {
  if (!value) return "";
  try {
    return new URL(value, base).toString();
  } catch {
    return value;
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const rawUrl = body?.url?.trim();

    if (!rawUrl) {
      return NextResponse.json({ error: "Missing URL" }, { status: 400 });
    }

    const targetUrl = rawUrl.startsWith("http://") || rawUrl.startsWith("https://")
      ? rawUrl
      : `https://${rawUrl}`;

    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Hinted Link Preview Bot/1.0",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Could not fetch that URL" }, { status: 400 });
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const title =
      readMeta($, ['meta[property="og:title"]', 'meta[name="twitter:title"]']) ||
      $("title").first().text().trim();

    const description =
      readMeta($, [
        'meta[property="og:description"]',
        'meta[name="twitter:description"]',
        'meta[name="description"]',
      ]) || "";

    const siteName = readMeta($, ['meta[property="og:site_name"]']);
    const image = absoluteUrl(
      readMeta($, ['meta[property="og:image"]', 'meta[name="twitter:image"]']),
      targetUrl
    );

    const canonical = absoluteUrl(
      readMeta($, ['link[rel="canonical"]', 'meta[property="og:url"]']) || targetUrl,
      targetUrl
    );

    return NextResponse.json({
      url: canonical,
      title: title || canonical,
      description,
      siteName,
      image,
    });
  } catch (error) {
    return NextResponse.json({ error: "Unable to build preview" }, { status: 500 });
  }
}
