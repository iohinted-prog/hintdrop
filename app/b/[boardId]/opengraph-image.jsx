import { ImageResponse } from "next/og";
import fs from "fs";
import path from "path";
import { createClient } from "../../../lib/supabase/server";
import { BRAND_ICON_WHITE_DATA_URI } from "../../../lib/brandIcon";

export const alt = "HintDrop";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";
// Doesn't inherit page.js's dynamic export - this is treated as its
// own route handler by Next.js, and its content (which hints, which
// images) is exactly as database-dependent as the page's own
// metadata, so it needs the same explicit opt-out of static caching.
export const dynamic = "force-dynamic";

const inter600 = fs.readFileSync(path.join(process.cwd(), "lib/fonts/inter-600.ttf"));
const inter700 = fs.readFileSync(path.join(process.cwd(), "lib/fonts/inter-700.ttf"));

// Proxied through Next's own image optimizer the same way the
// metadata images were fixed to be - external retailer hosts often
// block hotlinking/crawler-style fetches, which would otherwise make
// this render blank tiles for real product photos.
function proxied(url) {
  return `https://hintdrop.app/_next/image?url=${encodeURIComponent(url)}&w=800&q=75`;
}

function Tile({ src, style }) {
  return (
    <div style={{ position: "relative", overflow: "hidden", background: "#ead8ca", ...style }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={proxied(src)} width="100%" height="100%" style={{ objectFit: "cover" }} />
      ) : null}
    </div>
  );
}

// Mirrors BoardPreviewGrid.jsx's adaptive layout exactly - 1 image
// fills the frame, 2 split evenly, 3 is large-plus-two-stacked, 4+
// is a 2x2 grid - so the share preview actually matches what the
// board looks like on the site instead of showing an arbitrary crop.
function Collage({ images }) {
  const wrap = { width: "100%", height: "100%", display: "flex" };
  if (images.length === 0) {
    return <Tile style={{ width: "100%", height: "100%" }} />;
  }
  if (images.length === 1) {
    return <Tile src={images[0]} style={{ width: "100%", height: "100%" }} />;
  }
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

export default async function Image({ params }) {
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

  const images = (hints || []).map((h) => h.image_url);
  const ownerName = board?.profiles?.full_name?.split(" ")[0] || "Someone";
  const boardTitle = board?.title || "Hints";

  const fonts = [
    { name: "Inter", data: inter600, weight: 600, style: "normal" },
    { name: "Inter", data: inter700, weight: 700, style: "normal" },
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          fontFamily: "Inter",
          background: "#fffaf7",
        }}
      >
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
}
