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

export default async function Image({ params }) {
  try {
    const { boardId } = await params;
    const supabase = await createClient();

    const { data: board } = await supabase
      .from("hint_boards")
      .select("title, profiles(full_name)")
      .eq("id", boardId)
      .maybeSingle();

    // A single cover hint, not a multi-image collage - fetching
    // several external retailer images during this same render
    // proved unreliable across multiple attempts (both server-
    // prefetched and live Satori fetch), while this exact single-
    // image-via-proxy approach was separately confirmed working when
    // used as a plain og:image meta value. Simplifying to one image
    // to actually ship something real rather than keep chasing a
    // grid that doesn't render reliably.
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
    // Trying the original retailer URL directly this time, not
    // through /_next/image - every attempt routed through that proxy
    // (both live-fetched by Satori and pre-fetched server-side) came
    // back with an empty tile despite the rest of the render
    // succeeding, which points at that specific proxy hop rather than
    // image fetching in general. A self-referencing call from this
    // serverless function back into the same deployment's own image
    // optimizer is a plausible reason that specific path is the
    // common failure across every variant tried so far.
    const imageSrc = coverHint?.image_url || null;

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
    console.error("board opengraph-image failed, using fallback:", err);
    return FallbackImage();
  }
}
