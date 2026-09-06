import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function titleCase(text = "") {
  return String(text || "")
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

// Strip common leading filler words so the Pexels search is a bit sharper,
// e.g. "a weekend camping trip" -> "weekend camping trip"
function cleanSearchQuery(text = "") {
  return String(text || "")
    .trim()
    .replace(/^(a|an|the)\s+/i, "");
}

async function searchPexelsPhotos(query, count = 3) {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return [];

  const url = new URL("https://api.pexels.com/v1/search");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", String(count));
  url.searchParams.set("orientation", "portrait");

  // Own internal timeout, shorter than the client's 12s abort budget -
  // without this, a slow/hanging Pexels request could consume the
  // entire client-side window (or longer, if the client gives up but
  // this server-side fetch keeps running), when returning quickly with
  // no images (falling back to gradients) is a much better experience
  // than a long stall either way.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 7000);

  try {
    const response = await fetch(url.toString(), {
      headers: { Authorization: apiKey },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) return [];

    const data = await response.json();
    const photos = Array.isArray(data?.photos) ? data.photos : [];
    return photos
      .map((photo) => photo?.src?.large2x || photo?.src?.large || photo?.src?.medium || "")
      .filter(Boolean);
  } catch (error) {
    // Timeout or network failure - fall back to no images (triggers
    // the gradient picker) rather than letting the error bubble up
    // and fail the whole request.
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const prompt = String(body?.prompt || "").trim();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    const searchQuery = cleanSearchQuery(prompt);
    const images = await searchPexelsPhotos(searchQuery, 3);

    return NextResponse.json({
      title: titleCase(prompt),
      retailer: "Experience idea",
      images,
      source: "stock-photo",
      needsReview: true,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not find stock photos for that description." },
      { status: 500 }
    );
  }
}
