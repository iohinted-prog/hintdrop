import { createClient } from "../../../../lib/supabase/server";
import { BRAND_ICON_WHITE_DATA_URI } from "../../../../lib/brandIcon";

export const dynamic = "force-dynamic";

// Deliberately not part of the normal app - no header, no nav, no
// app chrome at all, just the exact 1200x630 collage + branding panel
// at a fixed pixel size, meant only to be visited by the headless
// browser in opengraph-image.jsx and screenshotted. Real <img> tags
// here are loaded by an actual browser (Playwright), which is why
// this works where a server-side fetch() of the same images didn't -
// this is a real browser request, not a raw HTTP client one.
function Tile({ src }) {
  return (
    <div style={{ position: "relative", flex: 1, overflow: "hidden", background: "#ead8ca" }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      ) : null}
    </div>
  );
}

function Collage({ images }) {
  const wrapStyle = { width: "100%", height: "100%", display: "flex" };
  if (images.length === 0) return <div style={{ width: "100%", height: "100%", background: "#ead8ca" }} />;
  if (images.length === 1) return <Tile src={images[0]} />;
  if (images.length === 2) {
    return (
      <div style={{ ...wrapStyle, gap: 6 }}>
        <Tile src={images[0]} />
        <Tile src={images[1]} />
      </div>
    );
  }
  if (images.length === 3) {
    return (
      <div style={{ ...wrapStyle, gap: 6 }}>
        <Tile src={images[0]} />
        <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 6 }}>
          <Tile src={images[1]} />
          <Tile src={images[2]} />
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", gap: 6 }}>
      <div style={{ display: "flex", flex: 1, gap: 6 }}>
        <Tile src={images[0]} />
        <Tile src={images[1]} />
      </div>
      <div style={{ display: "flex", flex: 1, gap: 6 }}>
        <Tile src={images[2]} />
        <Tile src={images[3]} />
      </div>
    </div>
  );
}

export default async function PreviewRenderPage({ params }) {
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

  // Branding panel only makes sense next to a single photo - with a
  // real multi-image collage, the grid itself is the point and should
  // use the full 1200x630 frame rather than being squeezed to half
  // width to make room for text that isn't needed there.
  if (images.length > 1) {
    return (
      <div style={{ width: 1200, height: 630, display: "flex", background: "#fffaf7", padding: 4 }}>
        <Collage images={images} />
      </div>
    );
  }

  return (
    <div style={{ width: 1200, height: 630, display: "flex", fontFamily: "Arial, sans-serif", background: "#fffaf7" }}>
      <div style={{ width: 630, height: 630, padding: 4, display: "flex" }}>
        <Collage images={images} />
      </div>
      <div
        style={{
          width: 570,
          height: 630,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 56px",
          background: "#ff875d",
          boxSizing: "border-box",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={BRAND_ICON_WHITE_DATA_URI} width={64} height={75} style={{ objectFit: "contain", marginBottom: 28 }} alt="" />
        <div style={{ fontSize: 42, fontWeight: 700, color: "#ffffff", letterSpacing: -1.5, lineHeight: 1.15 }}>
          {boardTitle}
        </div>
        <div style={{ fontSize: 24, fontWeight: 600, color: "rgba(255,255,255,0.85)", marginTop: 14 }}>
          {ownerName}&apos;s Hints on HintDrop
        </div>
      </div>
    </div>
  );
}
