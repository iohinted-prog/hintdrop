import { NextResponse } from "next/server";

function extractMeta(html, patterns) {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtml(match[1].trim());
  }
  return "";
}

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function makeAbsoluteUrl(value, base) {
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

    const targetUrl =
      rawUrl.startsWith("http://") || rawUrl.startsWith("https://")
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

    const title =
      extractMeta(html, [
        /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i,
        /<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["'][^>]*>/i,
        /<title[^>]*>([^<]+)<\/title>/i,
      ]) || targetUrl;

    const description = extractMeta(html, [
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["'][^>]*>/i,
      /<meta[^>]+name=["']twitter:description["'][^>]+content=["']([^"']+)["'][^>]*>/i,
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    ]);

    const image = makeAbsoluteUrl(
      extractMeta(html, [
        /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
        /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
      ]),
      targetUrl
    );

    const siteName = extractMeta(html, [
      /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    ]);

    const canonical = makeAbsoluteUrl(
      extractMeta(html, [
        /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i,
        /<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["'][^>]*>/i,
      ]) || targetUrl,
      targetUrl
    );

    return NextResponse.json({
      url: canonical,
      title,
      description,
      siteName,
      image,
    });
  } catch (error) {
    return NextResponse.json({ error: "Unable to build preview" }, { status: 500 });
  }
}
