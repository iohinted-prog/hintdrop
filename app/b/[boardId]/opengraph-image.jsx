import { ImageResponse } from "next/og";
import fs from "fs";
import path from "path";
import { createClient } from "../../../lib/supabase/server";
import { BRAND_ICON_WHITE_DATA_URI } from "../../../lib/brandIcon";

export const alt = "HintDrop";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const inter600 = fs.readFileSync(path.join(process.cwd(), "lib/fonts/inter-600.ttf"));
const inter700 = fs.readFileSync(path.join(process.cwd(), "lib/fonts/inter-700.ttf"));
const fonts = [
  { name: "Inter", data: inter600, weight: 600, style: "normal" },
  { name: "Inter", data: inter700, weight: 700, style: "normal" },
];

function FallbackImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#ff875d" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={BRAND_ICON_WHITE_DATA_URI} width={187} height={220} style={{ objectFit: "contain" }} />
      </div>
    ),
    size
  );
}

// Real Vercel logs (confirmed via the dashboard, not a guess) showed
// Satori's OWN internal fetch failing with a generic "fetch failed"
// across multiple unrelated retailer hosts (H&M, ASOS) - the common
// factor is Satori's fetch itself, not any one host blocking us. This
// fetches the image with Node's own fetch (a completely separate
// code path from whatever Satori uses internally) and hands Satori a
// ready-made base64 data URI instead, so Satori never attempts a
// network request of its own for it.
async function toDataUri(url) {
  try {
    const controller = new AbortController();
    // Confirmed via Vercel logs: the fetch itself was working, just
    // slower than the previous 5s timeout allowed for (AbortError,
    // not a network/DNS failure) - retailer image hosts responding
    // from this function's region evidently need more headroom than
    // that. Raised to 9s, leaving room under typical serverless
    // function execution limits for the DB queries and Satori render
    // that still need to happen after this resolves.
    const timeout = setTimeout(() => controller.abort(), 9000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
    });
    clearTimeout(timeout);
    if (!res.ok) {
      console.error("cover image fetch non-ok:", url, res.status);
      return null;
    }
    const contentType = res.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/")) {
      console.error("cover image fetch wrong content-type:", url, contentType);
      return null;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    console.error("cover image fetch succeeded:", url, buffer.length, "bytes");
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch (err) {
    console.error("cover image fetch threw:", url, err?.name, err?.message || err);
    return null;
  }
}

export default async function Image({ params }) {
  try {
    const { boardId } = await params;
    const supabase = await createClient();

    const { data: board } = await supabase
      .from("hint_boards")
      .select("title, profiles(full_name)")
      .eq("id", boardId)
      .maybeSingle();

    const { data: coverHint } = await supabase
      .from("hints")
      .select("image_url")
      .eq("board_id", boardId)
      .eq("is_private", false)
      .not("image_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const ownerName = board?.profiles?.full_name?.split(" ")[0] || "Someone";
    const boardTitle = board?.title || "Hints";
    const imageSrc = coverHint?.image_url ? await toDataUri(coverHint.image_url) : null;

    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", fontFamily: "Inter", background: "#fffaf7" }}>
          <div style={{ width: 630, height: "100%", padding: 4, display: "flex", background: "#ead8ca" }}>
            {imageSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageSrc} width="100%" height="100%" style={{ objectFit: "cover" }} />
            ) : null}
          </div>
          <div
            style={{
              width: 570,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              padding: "0 56px",
              background: "#ff875d",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BRAND_ICON_WHITE_DATA_URI} width={64} height={75} style={{ objectFit: "contain", marginBottom: 28 }} />
            <div style={{ display: "flex", fontSize: 42, fontWeight: 700, color: "#ffffff", letterSpacing: -1.5, lineHeight: 1.15 }}>
              {boardTitle}
            </div>
            <div style={{ display: "flex", fontSize: 24, fontWeight: 600, color: "rgba(255,255,255,0.85)", marginTop: 14 }}>
              {ownerName}&apos;s Hints on HintDrop
            </div>
          </div>
        </div>
      ),
      { ...size, fonts }
    );
  } catch (err) {
    console.error("board opengraph-image failed, using fallback:", err?.name, err?.message || err);
    return FallbackImage();
  }
}
