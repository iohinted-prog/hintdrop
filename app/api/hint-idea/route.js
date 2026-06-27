import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function extractJson(text = "") {
  const trimmed = String(text || "").trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {}
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function parseNumericPrice(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = String(value || "").replace(/,/g, "");
  const match = text.match(/(\d+(?:\.\d{1,2})?)/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatPriceText(currency = "GBP", amount = null) {
  if (amount == null) return "";
  const symbols = { GBP: "£", USD: "$", EUR: "€", ZAR: "R" };
  const symbol = symbols[currency] || "£";
  return `From ${symbol}${Math.round(amount).toLocaleString("en-GB")}`;
}

function mapRetailerLabel(category = "") {
  const value = String(category || "").toLowerCase();
  if (value.includes("travel")) return "Travel idea";
  if (value.includes("experience")) return "Experience idea";
  if (value.includes("fashion")) return "Fashion idea";
  if (value.includes("home")) return "Home idea";
  if (value.includes("beauty")) return "Beauty idea";
  if (value.includes("tech")) return "Tech idea";
  return "Gift idea";
}

async function searchPexelsPhoto(query) {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return "";

  const url = new URL("https://api.pexels.com/v1/search");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", "1");
  url.searchParams.set("orientation", "portrait");

  const response = await fetch(url.toString(), {
    headers: { Authorization: apiKey },
    cache: "no-store",
  });

  if (!response.ok) return "";

  const data = await response.json();
  const photo = data?.photos?.[0];
  return photo?.src?.large2x || photo?.src?.large || photo?.src?.medium || "";
}

export async function POST(request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY." }, { status: 500 });
    }

    const body = await request.json();
    const prompt = String(body?.prompt || "").trim();
    const currency = String(body?.currency || "GBP").trim().toUpperCase();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You create gift hint suggestions for a gifting app. " +
            "Return one JSON object only, with no markdown. " +
            "Do not claim live product facts. Use rough estimates only. " +
            "Keep titles short and card-friendly. " +
            "Return keys: title, category, searchQuery, numericPrice. " +
            "category should be one of: travel, experience, fashion, home, beauty, tech, gift. " +
            "searchQuery should be a short photo-search phrase. " +
            "numericPrice should be a single rough estimate number in the requested currency.",
        },
        {
          role: "user",
          content: `Idea: ${prompt}\nCurrency: ${currency}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const parsed = extractJson(aiResponse.choices[0]?.message?.content || "") || {};

    const title = String(parsed.title || prompt).trim() || "Saved hint";
    const category = String(parsed.category || "gift").trim();
    const searchQuery = String(parsed.searchQuery || title || prompt).trim() || prompt;
    const numericPrice = parseNumericPrice(parsed.numericPrice);
    const retailer = mapRetailerLabel(category);
    const priceText = formatPriceText(currency, numericPrice);
    const image = await searchPexelsPhoto(searchQuery);

    return NextResponse.json({
      title,
      retailer,
      image,
      numericPrice,
      priceText,
      currency,
      source: "ai-idea",
      needsReview: true,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not generate hint idea." },
      { status: 500 }
    );
  }
}
