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

// Fetches the original image directly rather than routing through
// Next's own /_next/image first - that self-referencing call (this
// route calling back into the same deployment's image optimizer)
// is a plausible source of the tile still coming back empty even
// though the layout/metadata around it rendered correctly. A direct
// server-side fetch isn't a browser or crawler, so it may not hit
// the same hotlinking restrictions those face anyway.
async function toDataUri(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
    });
    clearTimeout(timeout);
    if (!res.ok) {
      console.error("collage image fetch non-ok:", url, res.status);
      return null;
    }
    const contentType = res.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/")) {
      console.error("collage image fetch wrong content-type:", url, contentType);
      return null;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > 2_000_000) return null; // guard against an unexpectedly large response
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch (err) {
    console.error("collage image fetch failed:", url, err?.message || err);
    return null;
  }
}

function Tile({ src, style }) {
  return (
    <div style={{ position: "relative", overflow: "hidden", background: "#ead8ca", display: "flex", ...style }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} width="100%" height="100%" style={{ objectFit: "cover" }} />
      ) : null}
    </div>
  );
}

function Collage({ images }) {
  const wrap = { width: "100%", height: "100%", display: "flex" };
  if (images.length === 0) return <Tile style={{ width: "100%", height: "100%" }} />;
  if (images.length === 1) return <Tile src={images[0]} style={{ width: "100%", height: "100%" }} />;
  if (images.length === 2) {
    return (
      <div style={{ ...wrap, gap: 6 }}>
        <Tile src={images[0]} style={{ flex: 1, height: "100%" }} />
        <Tile src={images[1]} style={{ flex: 1, height: "100%" }} />
      </div>
    );
  }
  if (images.length === 3) {
    return (
      <div style={{ ...wrap, gap: 6 }}>
        <Tile src={images[0]} style={{ flex: 1, height: "100%" }} />
        <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 6, height: "100%" }}>
          <Tile src={images[1]} style={{ flex: 1, width: "100%" }} />
          <Tile src={images[2]} style={{ flex: 1, width: "100%" }} />
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", gap: 6 }}>
      <div style={{ display: "flex", flex: 1, gap: 6 }}>
        <Tile src={images[0]} style={{ flex: 1, height: "100%" }} />
        <Tile src={images[1]} style={{ flex: 1, height: "100%" }} />
      </div>
      <div style={{ display: "flex", flex: 1, gap: 6 }}>
        <Tile src={images[2]} style={{ flex: 1, height: "100%" }} />
        <Tile src={images[3]} style={{ flex: 1, height: "100%" }} />
      </div>
    </div>
  );
}

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

export default async function Image({ params }) {
  try {
    const { boardId } = await params;
    const supabase = await createClient();

    const { data: board } = await supabase
      .from("hint_boards")
      .select("title, profiles(full_name)")
      .eq("id", boardId)
      .maybeSingle();

    const { data: hints } = await supabase
      .from("hints")
      .select("image_url")
      .eq("board_id", boardId)
      .eq("is_private", false)
      .not("image_url", "is", null)
      .order("position", { ascending: true })
      .limit(4);

    const rawImages = (hints || []).map((h) => h.image_url);
    const images = (await Promise.all(rawImages.map(toDataUri))).filter(Boolean);
    const ownerName = board?.profiles?.full_name?.split(" ")[0] || "Someone";
    const boardTitle = board?.title || "Hints";

    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", fontFamily: "Inter", background: "#fffaf7" }}>
          <div style={{ width: 630, height: "100%", padding: 4, display: "flex" }}>
            <Collage images={images} />
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
    // Whatever goes wrong above (a bad board id, a Satori rendering
    // quirk, anything), this guarantees a real image still comes
    // back rather than the whole preview breaking again - a plain
    // branded fallback is a much better failure mode than nothing.
    console.error("board opengraph-image failed, using fallback:", err);
    return FallbackImage();
  }
}
